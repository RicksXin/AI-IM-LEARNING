# 认证数据库升级任务清单

> 设计来源：
> - `docs/research/project/auth_database_design.svg`
> - `docs/superpowers/plans/2026-06-18-auth-database-upgrade.md`
>
> 状态标记：⬜ 待处理 / 🔧 进行中 / ✅ 已完成
>
> 任务规则：每个任务只对应一个主要文件改动；代码片段只写骨架、字段、函数签名、关键 SQL 或逻辑步骤，不写完整实现。

## 0. 施工顺序总览

```text
数据库迁移文件
  -> 数据库脚本
  -> 后端认证 Store 契约测试
  -> 后端 Store 新表读写
  -> 后端密码设置/修改接口
  -> 前端模型和 API
  -> 前端设置密码引导 UI
  -> 文档与回归验证
```

## 1. 数据库迁移层

### ✅ Task 1.1 创建账户主体表迁移

**文件**：`server/migrations/202606180001_auth_accounts.sql`

**依赖**：无

**目标**：创建 `accounts` 表，承载账号稳定身份。

**关键骨架**：

```sql
-- +goose Up
CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  account_no VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- +goose Down
DROP TABLE IF EXISTS accounts;
```

**验收**：

```bash
./scripts/database/database_status.sh
```

### ✅ Task 1.2 创建用户资料表迁移

**文件**：`server/migrations/202606180002_auth_user_profiles.sql`

**依赖**：Task 1.1

**目标**：创建 `user_profiles` 表，和 `accounts` 保持 1:1。

**关键骨架**：

```sql
-- +goose Up
CREATE TABLE IF NOT EXISTS user_profiles (
  account_id VARCHAR(32) NOT NULL PRIMARY KEY,
  nickname VARCHAR(128) NOT NULL,
  avatar_url VARCHAR(255) NOT NULL,
  signature VARCHAR(255) NOT NULL DEFAULT '',
  CONSTRAINT fk_user_profile_account
    FOREIGN KEY (account_id) REFERENCES accounts(id)
    ON DELETE CASCADE
);

-- +goose Down
DROP TABLE IF EXISTS user_profiles;
```

**验收**：

```bash
./scripts/database/database_status.sh
```

### ✅ Task 1.3 创建认证凭据表迁移

**文件**：`server/migrations/202606180003_auth_credentials.sql`

**依赖**：Task 1.1

**目标**：创建 `auth_credentials` 表，支持手机号、邮箱、微信等多种登录方式。

**关键骨架**：

```sql
-- +goose Up
CREATE TABLE IF NOT EXISTS auth_credentials (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_id VARCHAR(32) NOT NULL,
  credential_type VARCHAR(32) NOT NULL,
  identifier VARCHAR(128) NOT NULL,
  secret_hash VARCHAR(255) NULL,
  UNIQUE KEY uniq_auth_credential (credential_type, identifier),
  CONSTRAINT fk_auth_credential_account
    FOREIGN KEY (account_id) REFERENCES accounts(id)
    ON DELETE CASCADE
);

-- +goose Down
DROP TABLE IF EXISTS auth_credentials;
```

**规格**：

```text
credential_type = phone
identifier = phone number
secret_hash = bcrypt password hash or null
```

### ✅ Task 1.4 创建短信验证码表迁移

**文件**：`server/migrations/202606180004_auth_sms_codes.sql`

**依赖**：无

**目标**：创建 `sms_codes` 表，保存验证码、过期时间、消费时间。

**关键骨架**：

```sql
-- +goose Up
CREATE TABLE IF NOT EXISTS sms_codes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(32) NOT NULL,
  code VARCHAR(12) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  consumed_at TIMESTAMP NULL,
  KEY idx_sms_codes_phone_expires_at (phone, expires_at)
);

-- +goose Down
DROP TABLE IF EXISTS sms_codes;
```

**后续建议**：生产环境可迁移到 Redis TTL。

## 2. 数据库脚本层

### ✅ Task 2.1 编写数据库脚本公共能力

**文件**：`scripts/database/database_common.sh`

**依赖**：Task 1.1 - Task 1.4

**目标**：统一数据库连接、Docker MySQL 检测、`goose` 检测安装、建库和删库保护。

**关键骨架**：

```bash
ensure_goose() {
  if command -v goose >/dev/null 2>&1; then
    return
  fi

  go install "github.com/pressly/goose/v3/cmd/goose@${GOOSE_VERSION}"
  export PATH="$(go env GOPATH)/bin:${PATH}"
}

validate_database_name() {
  # 拒绝空数据库名、系统库、非法字符
}

run_goose() {
  goose -dir "${MIGRATIONS_DIR}" mysql "$(database_dsn)" "$@"
}
```

**验收**：

```bash
bash -n scripts/database/database_common.sh
```

### ✅ Task 2.2 编写数据库创建脚本

**文件**：`scripts/database/database_create.sh`

**依赖**：Task 2.1

**目标**：创建数据库并执行全部 pending migrations。

**关键骨架**：

```bash
source "${SCRIPT_DIR}/database_common.sh"

create_database
run_goose up
```

**验收**：

```bash
./scripts/database/database_create.sh
```

### ✅ Task 2.3 编写数据库迁移脚本

**文件**：`scripts/database/database_migrate.sh`

**依赖**：Task 2.1

**目标**：执行增量迁移，供服务启动前调用。

**关键骨架**：

```bash
source "${SCRIPT_DIR}/database_common.sh"

create_database
run_goose up
```

**验收**：

```bash
./scripts/database/database_migrate.sh
```

### ✅ Task 2.4 编写数据库状态脚本

**文件**：`scripts/database/database_status.sh`

**依赖**：Task 2.1

**目标**：展示 goose migration 应用状态。

**关键骨架**：

```bash
source "${SCRIPT_DIR}/database_common.sh"

create_database
run_goose status
```

**验收**：

```bash
./scripts/database/database_status.sh
```

### ✅ Task 2.5 编写数据库清除脚本

**文件**：`scripts/database/database_drop.sh`

**依赖**：Task 2.1

**目标**：删除当前 `DB_NAME` 指向的数据库，保留安全库名保护。

**关键骨架**：

```bash
source "${SCRIPT_DIR}/database_common.sh"

drop_database
```

**验收**：

```bash
DB_NAME=flash_im_test ./scripts/database/database_drop.sh
```

### ✅ Task 2.6 编写数据库重置脚本

**文件**：`scripts/database/database_reset.sh`

**依赖**：Task 2.1 - Task 2.4

**目标**：删除、重建、重新迁移数据库，供测试环境快速清理。

**关键骨架**：

```bash
source "${SCRIPT_DIR}/database_common.sh"

drop_database
create_database
run_goose up
```

**验收**：

```bash
DB_NAME=flash_im_test ./scripts/database/database_reset.sh
```

### ✅ Task 2.7 服务启动前自动迁移

**文件**：`scripts/database/start_server_with_mysql.sh`

**依赖**：Task 2.3

**目标**：启动服务前默认执行非破坏性迁移。

**关键骨架**：

```bash
export RUN_DB_MIGRATIONS="${RUN_DB_MIGRATIONS:-true}"

if [ "${RUN_DB_MIGRATIONS}" = "true" ]; then
  "${SCRIPT_DIR}/database_migrate.sh"
fi

cd "${SERVER_DIR}"
exec go run .
```

**验收**：

```bash
RUN_DB_MIGRATIONS=false ./scripts/database/start_server_with_mysql.sh
```

### ✅ Task 2.8 编写数据库脚本文档

**文件**：`scripts/database/README.md`

**依赖**：Task 2.1 - Task 2.7

**目标**：说明脚本用途、默认环境变量、运行命令、安全限制。

**关键骨架**：

```md
## Commands

./scripts/database/database_create.sh
./scripts/database/database_migrate.sh
./scripts/database/database_status.sh
./scripts/database/database_reset.sh
./scripts/database/database_drop.sh
```

## 3. 后端认证 Store 层

### ✅ Task 3.1 编写认证 Store 契约测试

**文件**：`server/auth_store_contract_test.go`

**依赖**：Task 1.1 - Task 1.4

**目标**：先用测试定义 Store 行为，避免内存实现和 MySQL 实现语义分裂。

**关键骨架**：

```go
func TestAuthStoreContractSMSLoginCreatesAccountWithoutPassword(t *testing.T) {
  store := newAuthMemoryStore()

  err := store.saveSMSCode("13800009999", "123456")
  ok, err := store.verifySMSCode("13800009999", "123456")
  user, err := store.findOrCreateUserByPhone("13800009999")
  hasPassword, err := store.hasPassword(user.UserID)

  // assert ok == true
  // assert hasPassword == false
}

func TestAuthStoreContractPasswordLifecycle(t *testing.T) {
  // setInitialPassword
  // authenticatePassword
  // changePassword
  // old password fails, new password passes
}
```

**验收**：

```bash
cd server
go test ./...
```

### ✅ Task 3.2 扩展认证核心类型与处理器

**文件**：`server/auth.go`

**依赖**：Task 3.1

**目标**：扩展登录响应、Store 接口、JWT 用户解析复用、密码设置和修改 handler。

**关键骨架**：

```go
type LoginResponse struct {
  Token             string `json:"token"`
  UserID            string `json:"user_id"`
  AccountID         string `json:"account_id"`
  HasPassword       bool   `json:"has_password"`
  ShouldSetPassword bool   `json:"should_set_password"`
}

type authStoreBackend interface {
  hasPassword(userID string) (bool, error)
  setInitialPassword(userID string, password string) error
  changePassword(userID string, oldPassword string, newPassword string) error
}

func handlePasswordSetup(c *gin.Context) {
  // require JWT
  // validate password
  // authStore.setInitialPassword
}

func handlePasswordChange(c *gin.Context) {
  // require JWT
  // validate old_password and new_password
  // authStore.changePassword
}
```

**验收**：

```bash
cd server
go test ./...
```

### ✅ Task 3.3 切换 MySQL Store 到新表模型

**文件**：`server/auth_mysql_store.go`

**依赖**：Task 1.1 - Task 1.4，Task 3.2

**目标**：停止向旧 `users/auth_identities` 写入新数据，改为读写 `accounts/user_profiles/auth_credentials/sms_codes`。

**关键骨架**：

```go
func (store *mysqlAuthStore) findUserByPhone(phone string) (authUser, bool, error) {
  const query = `
    SELECT a.id, p.nickname, p.avatar_url, c.identifier
    FROM auth_credentials c
    JOIN accounts a ON a.id = c.account_id
    JOIN user_profiles p ON p.account_id = a.id
    WHERE c.credential_type = 'phone' AND c.identifier = ?
    LIMIT 1`
}

func (store *mysqlAuthStore) findOrCreateUserByPhone(phone string) (authUser, error) {
  // transaction:
  // insert accounts
  // insert user_profiles
  // insert auth_credentials credential_type=phone
}

func (store *mysqlAuthStore) authenticatePassword(phone string, password string) (authUser, bool, error) {
  // find phone credential
  // bcrypt.CompareHashAndPassword(secret_hash, password)
}
```

**验收**：

```bash
cd server
go test ./...
```

### ✅ Task 3.4 注册认证新路由

**文件**：`server/router.go`

**依赖**：Task 3.2

**目标**：新增正式认证路由，并保留旧 profile 路由兼容。

**关键骨架**：

```go
router.GET("/auth/profile", handleUserProfile)
router.POST("/auth/password/setup", handlePasswordSetup)
router.PUT("/auth/password", handlePasswordChange)

// compatibility
router.GET("/user/profile", handleUserProfile)
```

**验收**：

```bash
cd server
go test ./...
```

### ✅ Task 3.5 编写密码接口测试

**文件**：`server/auth_password_test.go`

**依赖**：Task 3.2 - Task 3.4

**目标**：覆盖密码设置、重复设置、修改密码、错误旧密码、密码登录成功。

**关键骨架**：

```go
func TestPasswordSetupRequiresToken(t *testing.T) {}

func TestPasswordSetupAllowsSmsUserToCreatePassword(t *testing.T) {
  // send sms
  // login by sms
  // POST /auth/password/setup
  // login by password
}

func TestPasswordChangeRequiresOldPassword(t *testing.T) {
  // setup password
  // PUT /auth/password with wrong old password
  // assert rejected
}
```

**验收**：

```bash
cd server
go test ./...
```

### ✅ Task 3.6 补充后端共享测试入口

**文件**：`server/main_test.go`

**依赖**：Task 3.1 - Task 3.5

**目标**：调整测试辅助函数，支持新的 account/profile/credential 行为。

**关键骨架**：

```go
func resetAuthStoreForTest() {
  authStore = newAuthMemoryStore()
  defaultChatRoomHub = newChatRoomHub()
}

func loginBySMSForTest(t *testing.T, router *gin.Engine, phone string) LoginResponse {
  // POST /auth/sms
  // POST /auth/login
  // return LoginResponse
}
```

**验收**：

```bash
cd server
go test ./...
```

## 4. 前端模型与 API 层

### ✅ Task 4.1 增加认证 JSON 布尔读取工具

**文件**：`client/flash_im/src/playground/auth/model/AuthJson.ts`

**依赖**：Task 3.2

**目标**：支持解析后端新增的 `has_password`、`should_set_password`。

**关键骨架**：

```ts
export function readAuthBoolean(value: unknown, field: string) {
  if (typeof value === 'boolean') {
    return value;
  }

  throw new Error(`Auth field "${field}" must be a boolean.`);
}
```

**验收**：

```bash
cd client/flash_im
pnpm test -- authModel.test.ts
```

### ✅ Task 4.2 扩展登录会话实体

**文件**：`client/flash_im/src/playground/auth/model/AuthSession.ts`

**依赖**：Task 4.1

**目标**：保存 `accountId`、`hasPassword`、`shouldSetPassword`。

**关键骨架**：

```ts
export type AuthSessionJson = {
  account_id?: unknown;
  has_password?: unknown;
  should_set_password?: unknown;
  token?: unknown;
  user_id?: unknown;
};

class AuthSession {
  readonly accountId: string;
  readonly hasPassword: boolean;
  readonly shouldSetPassword: boolean;
}
```

**验收**：

```bash
cd client/flash_im
pnpm test -- authModel.test.ts
```

### ✅ Task 4.3 扩展个人资料实体

**文件**：`client/flash_im/src/playground/auth/model/AuthUserProfile.ts`

**依赖**：Task 3.2

**目标**：兼容 `account_id` 和现有 `user_id`，保留页面展示字段。

**关键骨架**：

```ts
export type AuthUserProfileJson = {
  account_id?: unknown;
  avatar?: unknown;
  nickname?: unknown;
  phone?: unknown;
  user_id?: unknown;
};

class AuthUserProfile {
  readonly accountId: string;
  readonly userId: string;
}
```

**验收**：

```bash
cd client/flash_im
pnpm test -- authModel.test.ts
```

### ✅ Task 4.4 扩展认证 API

**文件**：`client/flash_im/src/playground/auth/api/AuthApi.ts`

**依赖**：Task 3.4，Task 4.2

**目标**：切换 profile 到 `/auth/profile`，增加设置密码和修改密码请求。

**关键骨架**：

```ts
export const AUTH_PROFILE_PATH = '/auth/profile';
export const AUTH_PASSWORD_SETUP_PATH = '/auth/password/setup';
export const AUTH_PASSWORD_CHANGE_PATH = '/auth/password';

async setupPassword(password: string) {
  const token = this.requireToken();
  return this.client.post(
    AUTH_PASSWORD_SETUP_PATH,
    { password },
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

async changePassword(oldPassword: string, newPassword: string) {
  const token = this.requireToken();
  return this.client.put(
    AUTH_PASSWORD_CHANGE_PATH,
    { old_password: oldPassword, new_password: newPassword },
    { headers: { Authorization: `Bearer ${token}` } },
  );
}
```

**验收**：

```bash
cd client/flash_im
pnpm test -- authApi.test.ts
```

### ✅ Task 4.5 导出新增认证能力

**文件**：`client/flash_im/src/playground/auth/index.ts`

**依赖**：Task 4.1 - Task 4.4

**目标**：导出新增常量、实体字段和 API 类型，保持模块边界一致。

**关键骨架**：

```ts
export {
  AUTH_PASSWORD_CHANGE_PATH,
  AUTH_PASSWORD_SETUP_PATH,
} from './api/AuthApi';

export { default as AuthSession } from './model/AuthSession';
```

**验收**：

```bash
cd client/flash_im
pnpm test -- authApi.test.ts authModel.test.ts
```

## 5. 前端视图层

### ✅ Task 5.1 创建设置密码视图

**文件**：`client/flash_im/src/playground/auth/view/AuthPasswordSetupView.tsx`

**依赖**：Task 4.4

**目标**：短信登录后，当 `shouldSetPassword = true` 时展示设置密码面板。

**关键骨架**：

```tsx
type AuthPasswordSetupViewProps = {
  confirmPassword: string;
  errorMessage?: string;
  isSaving: boolean;
  password: string;
  onConfirmPasswordChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
};

function AuthPasswordSetupView(props: AuthPasswordSetupViewProps) {
  // password input
  // confirm password input
  // eye visibility toggle
  // submit button
}
```

**验收**：

```bash
cd client/flash_im
pnpm test -- authView.test.tsx
```

### ✅ Task 5.2 AuthScreen 接入密码引导区域

**文件**：`client/flash_im/src/playground/auth/view/AuthScreen.tsx`

**依赖**：Task 5.1

**目标**：在已登录 profile 区域下方渲染设置密码面板。

**关键骨架**：

```tsx
type AuthScreenProps = {
  session?: AuthSession;
  setupPassword: string;
  setupPasswordConfirm: string;
  passwordSetupError?: string;
  onSetupPassword: () => void;
};

{profile ? (
  <>
    <AuthProfileView />
    {session?.shouldSetPassword ? <AuthPasswordSetupView /> : null}
  </>
) : (
  <AuthLoginView />
)}
```

**验收**：

```bash
cd client/flash_im
pnpm test -- authView.test.tsx
```

### ✅ Task 5.3 个人信息页展示密码状态

**文件**：`client/flash_im/src/playground/auth/view/AuthProfileView.tsx`

**依赖**：Task 4.2

**目标**：展示当前账号是否已设置密码，并保留退出登录入口。

**关键骨架**：

```tsx
type AuthProfileViewProps = {
  hasPassword?: boolean;
  profile: AuthUserProfile;
  tokenPreview?: string;
  onLogout: () => void;
};

<Text>{hasPassword ? '已设置登录密码' : '未设置登录密码'}</Text>
```

**验收**：

```bash
cd client/flash_im
pnpm test -- authView.test.tsx
```

### ✅ Task 5.4 AuthPlayground 串联登录与设置密码流程

**文件**：`client/flash_im/src/playground/cases/AuthPlayground.tsx`

**依赖**：Task 4.4，Task 5.1 - Task 5.3

**目标**：保存登录会话，处理设置密码表单状态和提交逻辑。

**关键骨架**：

```tsx
const [session, setSession] = useState<AuthSession | undefined>();
const [setupPassword, setSetupPassword] = useState('');
const [setupPasswordConfirm, setSetupPasswordConfirm] = useState('');

const handleSetupPassword = useCallback(async () => {
  // validate password
  // validate confirm
  // await api.setupPassword(...)
  // setSession(current => current?.withPasswordSet())
}, []);
```

**验收**：

```bash
cd client/flash_im
pnpm test -- authPlayground.test.tsx
```

## 6. 前端测试层

### ✅ Task 6.1 补充认证模型测试

**文件**：`client/flash_im/__tests__/authModel.test.ts`

**依赖**：Task 4.1 - Task 4.3

**目标**：覆盖新增 session 字段和异常输入。

**关键骨架**：

```ts
test('auth session maps password guidance fields', () => {
  expect(AuthSession.fromJson({
    account_id: 'account-1',
    has_password: false,
    should_set_password: true,
    token: 'jwt-token',
    user_id: 'account-1',
  })).toEqual(expect.objectContaining({
    hasPassword: false,
    shouldSetPassword: true,
  }));
});
```

**验收**：

```bash
cd client/flash_im
pnpm test -- authModel.test.ts
```

### ✅ Task 6.2 补充认证 API 测试

**文件**：`client/flash_im/__tests__/authApi.test.ts`

**依赖**：Task 4.4

**目标**：覆盖 `/auth/profile`、`/auth/password/setup`、`/auth/password` 请求。

**关键骨架**：

```ts
test('auth api sets password with bearer token', async () => {
  // login
  // api.setupPassword('new123456')
  // expect client.post AUTH_PASSWORD_SETUP_PATH
});

test('auth api changes password with bearer token', async () => {
  // login
  // api.changePassword('old123456', 'new123456')
  // expect client.put AUTH_PASSWORD_CHANGE_PATH
});
```

**验收**：

```bash
cd client/flash_im
pnpm test -- authApi.test.ts
```

### ✅ Task 6.3 补充认证视图测试

**文件**：`client/flash_im/__tests__/authView.test.tsx`

**依赖**：Task 5.1 - Task 5.3

**目标**：覆盖设置密码面板、密码可见性、提交按钮、错误提示。

**关键骨架**：

```tsx
test('auth screen renders password setup panel after sms login', async () => {
  // render AuthScreen with session.shouldSetPassword = true
  // expect text/input/button
});

test('auth password setup toggles password visibility', async () => {
  // press eye button
  // assert secureTextEntry changes
});
```

**验收**：

```bash
cd client/flash_im
pnpm test -- authView.test.tsx
```

### ✅ Task 6.4 补充认证 playground 流程测试

**文件**：`client/flash_im/__tests__/authPlayground.test.tsx`

**依赖**：Task 5.4

**目标**：覆盖短信登录成功后引导设置密码、设置成功后引导消失。

**关键骨架**：

```tsx
test('auth playground hides setup panel after password is set', async () => {
  // mock login response should_set_password = true
  // fill password and confirm password
  // press save
  // expect setup api called
  // expect guidance hidden
});
```

**验收**：

```bash
cd client/flash_im
pnpm test -- authPlayground.test.tsx
```

## 7. 文档与验收层

### ✅ Task 7.1 更新服务端系统说明

**文件**：`server/ReadMe.html`

**依赖**：Task 1 - Task 6

**目标**：说明 goose migration、认证新表模型、密码设置/修改接口、启动脚本。

**关键骨架**：

```html
<section>
  <h2>数据库迁移</h2>
  <pre><code>./scripts/database/database_create.sh</code></pre>
</section>

<section>
  <h2>认证数据模型</h2>
  <ul>
    <li>accounts</li>
    <li>user_profiles</li>
    <li>auth_credentials</li>
    <li>sms_codes</li>
  </ul>
</section>
```

### ✅ Task 7.2 编写升级汇报文档

**文件**：`docs/develop/report/2026-06-18-auth-database-upgrade.html`

**依赖**：Task 1 - Task 7.1

**目标**：记录这次认证数据库升级的背景、模型、接口、测试结果和后续风险。

**关键骨架**：

```html
<section>
  <h2>升级目标</h2>
  <p>从内存/简单 users 模型升级到 MySQL 持久化账号模型。</p>
</section>

<section>
  <h2>验证结果</h2>
  <pre><code>go test ./...</code></pre>
  <pre><code>pnpm test</code></pre>
</section>
```

### ✅ Task 7.3 最终回归验收

**文件**：`docs/features/auth-database-upgrade/v1/tasks.md`

**依赖**：Task 1 - Task 7.2

**目标**：在本任务清单中更新最终状态，确认关键命令全部通过。

**关键命令**：

```bash
cd server
go test ./...

cd ../client/flash_im
pnpm test

cd /Users/zhangxiaoen/Desktop/AI-IM-LEARNING
./scripts/database/database_status.sh
```

**完成标准**：

```text
✅ goose migrations applied
✅ backend tests passed
✅ frontend tests passed
✅ auth playground can login by SMS
✅ SMS-login user can set password
✅ password login works after setup
```

## 8. 当前进度快照

```text
✅ 已完成：数据库迁移文件
✅ 已完成：goose 脚本和数据库自动创建方案
✅ 已完成：迁移已应用到 flash_im
✅ 已完成：后端 Store 切到 accounts/user_profiles/auth_credentials/sms_codes
✅ 已完成：密码设置/修改接口
✅ 已完成：前端会话模型、API、设置密码 UI
✅ 已完成：完整测试和汇报文档
```
