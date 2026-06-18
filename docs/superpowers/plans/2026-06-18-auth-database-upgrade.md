# Auth Database Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the playground auth system from in-memory / simple user storage to a MySQL-backed account model with password setup, password change, and login guidance flags.

**Architecture:** Keep the current public playground API shape stable where possible, but change the persistence model to `accounts + user_profiles + auth_credentials + sms_codes`. The backend remains Gin + JWT + bcrypt + MySQL, while the React Native playground keeps the existing `auth/model/api/view` separation and adds password guidance as a focused UI layer.

**Tech Stack:** Go 1.25, Gin, MySQL, `github.com/go-sql-driver/mysql`, `github.com/golang-jwt/jwt/v5`, `golang.org/x/crypto/bcrypt`, React Native, TypeScript, Axios, Jest.

---

## Context

Current backend files:

- Modify: `server/auth.go`
- Modify: `server/auth_mysql_store.go`
- Modify: `server/router.go`
- Modify: `server/main_test.go`
- Modify: `server/config_test.go` if database test env handling changes
- Modify: `server/ReadMe.html`
- Create: `server/auth_store_contract_test.go`
- Create: `server/auth_password_test.go`

Current frontend files:

- Modify: `client/flash_im/src/playground/auth/api/AuthApi.ts`
- Modify: `client/flash_im/src/playground/auth/model/AuthJson.ts`
- Modify: `client/flash_im/src/playground/auth/model/AuthSession.ts`
- Modify: `client/flash_im/src/playground/auth/model/AuthUserProfile.ts`
- Modify: `client/flash_im/src/playground/auth/index.ts`
- Modify: `client/flash_im/src/playground/cases/AuthPlayground.tsx`
- Modify: `client/flash_im/src/playground/auth/view/AuthScreen.tsx`
- Modify: `client/flash_im/src/playground/auth/view/AuthProfileView.tsx`
- Create: `client/flash_im/src/playground/auth/view/AuthPasswordSetupView.tsx`
- Test: `client/flash_im/__tests__/authApi.test.ts`
- Test: `client/flash_im/__tests__/authModel.test.ts`
- Test: `client/flash_im/__tests__/authView.test.tsx`
- Test: `client/flash_im/__tests__/authPlayground.test.tsx`

Docs and scripts:

- Existing design diagram: `docs/research/project/auth_database_design.svg`
- Create: `server/migrations/202606180001_auth_accounts.sql`
- Create: `server/migrations/202606180002_auth_user_profiles.sql`
- Create: `server/migrations/202606180003_auth_credentials.sql`
- Create: `server/migrations/202606180004_auth_sms_codes.sql`
- Create: `scripts/database/database_common.sh`
- Create: `scripts/database/database_create.sh`
- Create: `scripts/database/database_migrate.sh`
- Create: `scripts/database/database_reset.sh`
- Create: `scripts/database/database_drop.sh`
- Modify: `scripts/database/start_server_with_mysql.sh` only if it should run migrations before server startup
- Create or modify: `docs/develop/report/2026-06-18-auth-database-upgrade.html`

Compatibility rule:

- Add `GET /auth/profile` as the new profile endpoint.
- Keep `GET /user/profile` working as a compatibility alias until the playground fully moves over.
- Keep login response `user_id` for the current frontend, but also make it semantically equal to `account_id`.

---

## Target Data Model

### `accounts`

```sql
CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  account_no VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `user_profiles`

```sql
CREATE TABLE IF NOT EXISTS user_profiles (
  account_id VARCHAR(32) NOT NULL PRIMARY KEY,
  nickname VARCHAR(128) NOT NULL,
  avatar_url VARCHAR(255) NOT NULL,
  signature VARCHAR(255) NOT NULL DEFAULT '',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_profile_account
    FOREIGN KEY (account_id) REFERENCES accounts(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `auth_credentials`

```sql
CREATE TABLE IF NOT EXISTS auth_credentials (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_id VARCHAR(32) NOT NULL,
  credential_type VARCHAR(32) NOT NULL,
  identifier VARCHAR(128) NOT NULL,
  secret_hash VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_auth_credential (credential_type, identifier),
  KEY idx_auth_credential_account_id (account_id),
  CONSTRAINT fk_auth_credential_account
    FOREIGN KEY (account_id) REFERENCES accounts(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `sms_codes`

```sql
CREATE TABLE IF NOT EXISTS sms_codes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(32) NOT NULL,
  code VARCHAR(12) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  consumed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_sms_codes_phone_expires_at (phone, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Task 1: Backend Auth Contract Tests

**Files:**

- Create: `server/auth_store_contract_test.go`
- Modify: `server/main_test.go`

- [ ] **Step 1: Write store contract tests**

Create tests that describe behavior independent of memory or MySQL storage:

```go
func TestAuthStoreContractSMSLoginCreatesAccountWithoutPassword(t *testing.T) {
  store := newAuthMemoryStore()

  if err := store.saveSMSCode("13800009999", "123456"); err != nil {
    t.Fatalf("save sms: %v", err)
  }

  ok, err := store.verifySMSCode("13800009999", "123456")
  if err != nil || !ok {
    t.Fatalf("verify sms ok = %v, err = %v", ok, err)
  }

  user, err := store.findOrCreateUserByPhone("13800009999")
  if err != nil {
    t.Fatalf("find or create user: %v", err)
  }

  hasPassword, err := store.hasPassword(user.UserID)
  if err != nil {
    t.Fatalf("has password: %v", err)
  }
  if hasPassword {
    t.Fatal("sms-created account should not have password")
  }
}
```

- [ ] **Step 2: Add password lifecycle contract tests**

Add tests for:

- `setInitialPassword(userID, password)` succeeds only once.
- Password login succeeds after setup.
- `changePassword(userID, oldPassword, newPassword)` rejects wrong old password.
- Password login succeeds with the new password and fails with the old password.

Expected new interface methods:

```go
hasPassword(userID string) (bool, error)
setInitialPassword(userID string, password string) error
changePassword(userID string, oldPassword string, newPassword string) error
```

- [ ] **Step 3: Run tests and verify they fail**

Run:

```bash
cd /Users/zhangxiaoen/Desktop/AI-IM-LEARNING/server
go test ./...
```

Expected: FAIL because the new auth store methods do not exist yet.

- [ ] **Step 4: Commit tests**

```bash
git add server/auth_store_contract_test.go server/main_test.go
git commit -m "test: describe auth store password lifecycle"
```

---

## Task 2: Backend Store Model Migration

**Files:**

- Modify: `server/auth.go`
- Modify: `server/auth_mysql_store.go`
- Test: `server/auth_store_contract_test.go`

- [ ] **Step 1: Update backend domain naming without breaking API**

Keep `authUser` for now to reduce blast radius, but treat `UserID` as `account_id` internally.

Add password state methods to `authStoreBackend`:

```go
type authStoreBackend interface {
  saveSMSCode(phone string, code string) error
  verifySMSCode(phone string, code string) (bool, error)
  findOrCreateUserByPhone(phone string) (authUser, error)
  authenticatePassword(phone string, password string) (authUser, bool, error)
  findUserByID(userID string) (authUser, bool, error)
  hasPassword(userID string) (bool, error)
  setInitialPassword(userID string, password string) error
  changePassword(userID string, oldPassword string, newPassword string) error
}
```

- [ ] **Step 2: Update memory store**

Implement the new methods on `authMemoryStore`.

Important behavior:

- SMS-created accounts have no password.
- Seed users still have passwords.
- `setInitialPassword` returns an error if the account already has a password.
- `changePassword` compares the old password before replacing it.

- [ ] **Step 3: Move table ownership to goose migrations**

Use `server/migrations` as the source of truth for database tables. The migration files must create:

- `accounts`
- `user_profiles`
- `auth_credentials`
- `sms_codes`

Leave old `users` / `auth_identities` untouched for now if they already exist, but stop writing new data to them. After goose is in place, `server/auth_mysql_store.go` should not be the long-term owner of `CREATE TABLE` DDL.

- [ ] **Step 4: Rewrite MySQL queries to the new schema**

Required mapping:

- `findUserByID` joins `accounts` and `user_profiles`, plus phone credential.
- `findUserByPhone` finds `auth_credentials.credential_type = 'phone'`.
- `findOrCreateUserByPhone` inserts `accounts`, `user_profiles`, and `auth_credentials`.
- `authenticatePassword` reads the `phone` credential row and compares `secret_hash`.

Recommended simple choice for playground:

```text
credential_type = phone
identifier = phone number
secret_hash = password hash or null
```

This keeps one phone credential row and avoids duplicate `phone` and `password` rows for the same identifier.

- [ ] **Step 5: Run backend tests**

Run:

```bash
cd /Users/zhangxiaoen/Desktop/AI-IM-LEARNING/server
go test ./...
```

Expected: PASS.

- [ ] **Step 6: Run MySQL integration check**

Run with the Docker MySQL container:

```bash
cd /Users/zhangxiaoen/Desktop/AI-IM-LEARNING/server
DB_HOST=127.0.0.1 \
DB_PORT=3307 \
DB_USER=root \
DB_PASSWORD=flash_im_pwd \
DB_NAME=flash_im_test \
go test ./...
```

Expected: PASS and MySQL has the new tables. Before running server tests against MySQL, run:

```bash
cd /Users/zhangxiaoen/Desktop/AI-IM-LEARNING
DB_NAME=flash_im_test ./scripts/database/database_reset.sh
```

- [ ] **Step 7: Commit store migration**

```bash
git add server/auth.go server/auth_mysql_store.go server/auth_store_contract_test.go
git commit -m "feat: store auth data in account credential tables"
```

---

## Task 3: Backend Password Setup and Change APIs

**Files:**

- Modify: `server/auth.go`
- Modify: `server/router.go`
- Create: `server/auth_password_test.go`
- Modify: `server/main_test.go` if shared helpers are needed

- [ ] **Step 1: Write handler tests for login guidance flags**

Add tests:

```go
func TestSMSLoginReturnsPasswordGuidanceForNewAccount(t *testing.T) {
  gin.SetMode(gin.TestMode)
  resetAuthStoreForTest()

  router := setupRouter()

  smsRecorder := httptest.NewRecorder()
  smsBody := bytes.NewBufferString(`{"phone":"13800009999"}`)
  router.ServeHTTP(smsRecorder, httptest.NewRequest(http.MethodPost, "/auth/sms", smsBody))

  var sms SMSResponse
  if err := json.Unmarshal(smsRecorder.Body.Bytes(), &sms); err != nil {
    t.Fatalf("decode sms: %v", err)
  }

  loginRecorder := httptest.NewRecorder()
  loginBody := bytes.NewBufferString(fmt.Sprintf(
    `{"phone":"13800009999","code":%q,"login_type":"sms"}`,
    sms.Code,
  ))
  router.ServeHTTP(loginRecorder, httptest.NewRequest(http.MethodPost, "/auth/login", loginBody))

  if loginRecorder.Code != http.StatusOK {
    t.Fatalf("login status = %d", loginRecorder.Code)
  }

  var response LoginResponse
  if err := json.Unmarshal(loginRecorder.Body.Bytes(), &response); err != nil {
    t.Fatalf("decode login: %v", err)
  }
  if response.HasPassword {
    t.Fatal("new sms account should not have password")
  }
  if !response.ShouldSetPassword {
    t.Fatal("new sms account should be guided to set password")
  }
}
```

- [ ] **Step 2: Extend `LoginResponse`**

In `server/auth.go`:

```go
type LoginResponse struct {
  Token             string `json:"token"`
  UserID            string `json:"user_id"`
  AccountID         string `json:"account_id"`
  HasPassword       bool   `json:"has_password"`
  ShouldSetPassword bool   `json:"should_set_password"`
}
```

When login succeeds:

```go
hasPassword, err := authStore.hasPassword(user.UserID)
if err != nil {
  c.JSON(http.StatusInternalServerError, gin.H{"error": "auth storage failed"})
  return
}

c.JSON(http.StatusOK, LoginResponse{
  Token: token,
  UserID: user.UserID,
  AccountID: user.UserID,
  HasPassword: hasPassword,
  ShouldSetPassword: !hasPassword,
})
```

- [ ] **Step 3: Write tests for password setup endpoint**

Target endpoint:

```text
POST /auth/password/setup
Authorization: Bearer <token>
Body: {"password":"new-password"}
```

Expected behavior:

- Missing token returns 401.
- Missing password returns 400.
- First setup returns 200.
- Second setup returns 409.
- Password login works after setup.

- [ ] **Step 4: Write tests for password change endpoint**

Target endpoint:

```text
PUT /auth/password
Authorization: Bearer <token>
Body: {"old_password":"old","new_password":"new"}
```

Expected behavior:

- Missing token returns 401.
- Wrong old password returns 401 or 400 with a clear error.
- Correct old password returns 200.
- Old password login fails, new password login succeeds.

- [ ] **Step 5: Implement request structs and handlers**

In `server/auth.go`:

```go
type PasswordSetupRequest struct {
  Password string `json:"password"`
}

type PasswordChangeRequest struct {
  OldPassword string `json:"old_password"`
  NewPassword string `json:"new_password"`
}
```

Add helper:

```go
func requireAuthUserID(c *gin.Context) (string, bool) {
  tokenText := extractTokenFromHeader(c.GetHeader("Authorization"), c.GetHeader("Token"))
  if tokenText == "" {
    c.JSON(http.StatusUnauthorized, gin.H{"error": "token is required"})
    return "", false
  }

  userID, err := parseUserIDFromJWT(tokenText)
  if err != nil {
    c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
    return "", false
  }

  return userID, true
}
```

- [ ] **Step 6: Register new routes**

In `server/router.go`:

```go
router.GET("/auth/profile", handleUserProfile)
router.POST("/auth/password/setup", handlePasswordSetup)
router.PUT("/auth/password", handlePasswordChange)
```

Keep:

```go
router.GET("/user/profile", handleUserProfile)
```

- [ ] **Step 7: Run backend tests**

```bash
cd /Users/zhangxiaoen/Desktop/AI-IM-LEARNING/server
go test ./...
```

Expected: PASS.

- [ ] **Step 8: Commit API work**

```bash
git add server/auth.go server/router.go server/auth_password_test.go server/main_test.go
git commit -m "feat: add password setup and change endpoints"
```

---

## Task 4: Frontend Auth Models and API

**Files:**

- Modify: `client/flash_im/src/playground/auth/model/AuthSession.ts`
- Modify: `client/flash_im/src/playground/auth/model/AuthUserProfile.ts`
- Modify: `client/flash_im/src/playground/auth/model/AuthJson.ts`
- Modify: `client/flash_im/src/playground/auth/api/AuthApi.ts`
- Modify: `client/flash_im/src/playground/auth/index.ts`
- Test: `client/flash_im/__tests__/authModel.test.ts`
- Test: `client/flash_im/__tests__/authApi.test.ts`

- [ ] **Step 1: Write model tests for login flags**

In `authModel.test.ts`, update the session mapping test:

```ts
expect(
  AuthSession.fromJson({
    account_id: 'account-1',
    has_password: false,
    should_set_password: true,
    token: 'jwt-token',
    user_id: 'account-1',
  }),
).toEqual(
  new AuthSession({
    accountId: 'account-1',
    hasPassword: false,
    shouldSetPassword: true,
    token: 'jwt-token',
    userId: 'account-1',
  }),
);
```

- [ ] **Step 2: Update `AuthSession`**

In `AuthSession.ts`:

```ts
export type AuthSessionJson = {
  account_id?: unknown;
  has_password?: unknown;
  should_set_password?: unknown;
  token?: unknown;
  user_id?: unknown;
};
```

Add boolean reader to `AuthJson.ts` if one does not exist:

```ts
export function readAuthBoolean(value: unknown, field: string) {
  if (typeof value === 'boolean') {
    return value;
  }
  throw new Error(`Auth field "${field}" must be a boolean.`);
}
```

- [ ] **Step 3: Write API tests for new endpoints**

In `authApi.test.ts`, cover:

- `AUTH_PROFILE_PATH` becomes `/auth/profile`.
- `setupPassword(password)` posts to `/auth/password/setup` with Bearer token.
- `changePassword(oldPassword, newPassword)` puts to `/auth/password` with Bearer token.
- Both password APIs reject without a saved token.

- [ ] **Step 4: Update `AuthApi` constants and methods**

In `AuthApi.ts`:

```ts
export const AUTH_PROFILE_PATH = '/auth/profile';
export const AUTH_PASSWORD_SETUP_PATH = '/auth/password/setup';
export const AUTH_PASSWORD_CHANGE_PATH = '/auth/password';
```

Add methods:

```ts
async setupPassword(password: string) {
  const token = this.requireToken();
  await this.client.post(
    AUTH_PASSWORD_SETUP_PATH,
    { password },
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

async changePassword(oldPassword: string, newPassword: string) {
  const token = this.requireToken();
  await this.client.put(
    AUTH_PASSWORD_CHANGE_PATH,
    { old_password: oldPassword, new_password: newPassword },
    { headers: { Authorization: `Bearer ${token}` } },
  );
}
```

If `AuthHttpClient` does not have `put`, extend it.

- [ ] **Step 5: Run frontend tests**

```bash
cd /Users/zhangxiaoen/Desktop/AI-IM-LEARNING/client/flash_im
pnpm test -- authModel.test.ts authApi.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit frontend model/API work**

```bash
git add client/flash_im/src/playground/auth/model client/flash_im/src/playground/auth/api/AuthApi.ts client/flash_im/src/playground/auth/index.ts client/flash_im/__tests__/authModel.test.ts client/flash_im/__tests__/authApi.test.ts
git commit -m "feat: support auth password guidance api"
```

---

## Task 5: Frontend Password Guidance UI

**Files:**

- Modify: `client/flash_im/src/playground/cases/AuthPlayground.tsx`
- Modify: `client/flash_im/src/playground/auth/view/AuthScreen.tsx`
- Modify: `client/flash_im/src/playground/auth/view/AuthProfileView.tsx`
- Create: `client/flash_im/src/playground/auth/view/AuthPasswordSetupView.tsx`
- Test: `client/flash_im/__tests__/authView.test.tsx`
- Test: `client/flash_im/__tests__/authPlayground.test.tsx`

- [ ] **Step 1: Write view tests for password guidance**

In `authView.test.tsx`, add cases:

- After login with `shouldSetPassword = true`, render a compact "设置登录密码" panel.
- Panel has password input and confirm password input.
- Save button calls `onSetupPassword`.
- Password mismatch renders a clear error.
- Eye icon toggles visibility for setup password fields.

- [ ] **Step 2: Create `AuthPasswordSetupView`**

Props:

```ts
type AuthPasswordSetupViewProps = {
  confirmPassword: string;
  errorMessage?: string;
  isSaving: boolean;
  password: string;
  onConfirmPasswordChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
};
```

Design notes:

- Keep the current high-end, compact auth card style.
- Use an eye button for password visibility.
- Avoid long explanatory text in the app UI.
- Use accessible labels:
  - `设置密码输入`
  - `确认设置密码输入`
  - `保存登录密码`
  - `显示设置密码`
  - `隐藏设置密码`

- [ ] **Step 3: Wire state in `AuthPlayground.tsx`**

Track:

```ts
const [session, setSession] = useState<AuthSession | undefined>();
const [setupPassword, setSetupPassword] = useState('');
const [setupPasswordConfirm, setSetupPasswordConfirm] = useState('');
const [isSettingPassword, setIsSettingPassword] = useState(false);
const [passwordSetupError, setPasswordSetupError] = useState<string | undefined>();
```

After login:

```ts
const nextSession =
  loginType === AuthLoginType.Password
    ? await api.loginWithPassword(phone.trim(), password.trim())
    : await api.loginWithSms(phone.trim(), code.trim());
setSession(nextSession);
```

Show setup panel only when:

```ts
profile && session?.shouldSetPassword
```

- [ ] **Step 4: Implement setup password flow**

Validation:

- Empty password: `请输入新密码。`
- Password length less than 6: `密码至少 6 位。`
- Confirm mismatch: `两次输入的密码不一致。`

Success behavior:

- Call `api.setupPassword(setupPassword.trim())`.
- Clear setup fields.
- Update local session to `hasPassword: true`, `shouldSetPassword: false`.
- Show status message `登录密码已设置。`

- [ ] **Step 5: Add password change entry after password exists**

For this playground iteration, keep it simple:

- In `AuthProfileView`, show a "修改密码" action only when `hasPassword` is true.
- Reuse `AuthPasswordSetupView` or create a small change form only if the UI remains readable.
- If the form becomes too large, split into a follow-up task and keep backend/API tested now.

- [ ] **Step 6: Run frontend view tests**

```bash
cd /Users/zhangxiaoen/Desktop/AI-IM-LEARNING/client/flash_im
pnpm test -- authView.test.tsx authPlayground.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit UI work**

```bash
git add client/flash_im/src/playground/cases/AuthPlayground.tsx client/flash_im/src/playground/auth/view client/flash_im/__tests__/authView.test.tsx client/flash_im/__tests__/authPlayground.test.tsx
git commit -m "feat: guide users to set login password"
```

---

## Task 6: Manual Verification With MySQL

**Files:**

- Modify: `docs/develop/report/2026-06-18-auth-database-upgrade.html`
- Modify: `server/ReadMe.html`

- [ ] **Step 1: Start backend with MySQL**

```bash
cd /Users/zhangxiaoen/Desktop/AI-IM-LEARNING
./scripts/database/start_server_with_mysql.sh
```

Expected:

- Server starts on `0.0.0.0:8080`.
- MySQL connection points to `127.0.0.1:3307/flash_im`.
- New tables exist.

- [ ] **Step 2: Verify SMS login**

```bash
curl -s -X POST http://127.0.0.1:8080/auth/sms \
  -H 'Content-Type: application/json' \
  -d '{"phone":"13800008888"}'
```

Then use the returned code:

```bash
curl -s -X POST http://127.0.0.1:8080/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"13800008888","code":"<CODE>","login_type":"sms"}'
```

Expected response contains:

```json
{
  "token": "...",
  "user_id": "...",
  "account_id": "...",
  "has_password": false,
  "should_set_password": true
}
```

- [ ] **Step 3: Verify password setup**

```bash
curl -s -X POST http://127.0.0.1:8080/auth/password/setup \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <TOKEN>' \
  -d '{"password":"new123456"}'
```

Expected: 200 OK.

- [ ] **Step 4: Verify password login**

```bash
curl -s -X POST http://127.0.0.1:8080/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"13800008888","password":"new123456","login_type":"password"}'
```

Expected response contains:

```json
{
  "has_password": true,
  "should_set_password": false
}
```

- [ ] **Step 5: Verify profile**

```bash
curl -s http://127.0.0.1:8080/auth/profile \
  -H 'Authorization: Bearer <TOKEN>'
```

Expected: 200 OK with nickname, avatar, phone, and user/account id.

- [ ] **Step 6: Verify React Native tests**

```bash
cd /Users/zhangxiaoen/Desktop/AI-IM-LEARNING/client/flash_im
pnpm test -- authApi.test.ts authModel.test.ts authView.test.tsx authPlayground.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Write report**

Create `docs/develop/report/2026-06-18-auth-database-upgrade.html` with:

- Database table split summary.
- API changes.
- Password setup/change behavior.
- Test commands and results.
- Known compatibility notes: `user_id` remains as client-facing alias of `account_id`.

- [ ] **Step 8: Commit verification docs**

```bash
git add server/ReadMe.html docs/develop/report/2026-06-18-auth-database-upgrade.html
git commit -m "docs: report auth database upgrade"
```

---

## Task 7: Full Regression

**Files:**

- No new files unless failures require fixes.

- [ ] **Step 1: Run all backend tests**

```bash
cd /Users/zhangxiaoen/Desktop/AI-IM-LEARNING/server
go test ./...
```

Expected: PASS.

- [ ] **Step 2: Run all frontend tests**

```bash
cd /Users/zhangxiaoen/Desktop/AI-IM-LEARNING/client/flash_im
pnpm test
```

Expected: PASS.

- [ ] **Step 3: Run playground app**

For iOS:

```bash
cd /Users/zhangxiaoen/Desktop/AI-IM-LEARNING/client/flash_im
pnpm run ios
```

For Android playground:

```bash
cd /Users/zhangxiaoen/Desktop/AI-IM-LEARNING/client/flash_im
pnpm run android:playground
```

Expected:

- Auth playground can send SMS.
- SMS login succeeds.
- New account shows password setup guidance.
- Password setup succeeds.
- Logout clears token.
- Password login succeeds.

- [ ] **Step 4: Final commit if fixes were needed**

```bash
git status --short
git add <changed-files>
git commit -m "fix: stabilize auth database upgrade"
```

---

## Risks and Decisions

- **Schema naming:** Use `accounts/user_profiles/auth_credentials/sms_codes`, not `users/auth_identities`.
- **Compatibility:** Keep `user_id` in JSON because current frontend and chat room JWT logic already depend on it.
- **Phone credential modeling:** For playground simplicity, one `phone` credential row can hold both phone identifier and optional password hash. If later adding email or third-party login, add credential rows with `credential_type = email/wechat/apple`.
- **SMS storage:** MySQL is acceptable for learning. Production should move verification codes to Redis with TTL and rate limiting.
- **Migration safety:** This plan does not migrate existing old-table data. If old playground data matters, add a separate migration task before deleting old tables.
- **Security:** Passwords must always use bcrypt. Never log passwords or JWT tokens in full.

---

## Definition of Done

- Backend uses MySQL tables matching `docs/research/project/auth_database_design.svg`.
- SMS login creates an account, profile, and phone credential.
- Login response includes `has_password` and `should_set_password`.
- Password setup and password change endpoints work with JWT.
- Frontend auth API and models parse the new response fields.
- Playground UI guides SMS-login users to set a password.
- Backend `go test ./...` passes.
- Frontend `pnpm test` passes.
- Report is written to `docs/develop/report/2026-06-18-auth-database-upgrade.html`.
