import { readAuthBoolean, readAuthString } from './AuthJson';

export type AuthSessionJson = {
  account_id?: unknown;
  has_password?: unknown;
  should_set_password?: unknown;
  token?: unknown;
  user_id?: unknown;
};

export type AuthSessionProps = {
  accountId: string;
  hasPassword: boolean;
  shouldSetPassword: boolean;
  token: string;
  userId: string;
};

class AuthSession {
  readonly accountId: string;
  readonly hasPassword: boolean;
  readonly shouldSetPassword: boolean;
  readonly token: string;
  readonly userId: string;

  constructor(props: AuthSessionProps) {
    this.accountId = props.accountId;
    this.hasPassword = props.hasPassword;
    this.shouldSetPassword = props.shouldSetPassword;
    this.token = props.token;
    this.userId = props.userId;
  }

  withPasswordSet() {
    return new AuthSession({
      accountId: this.accountId,
      hasPassword: true,
      shouldSetPassword: false,
      token: this.token,
      userId: this.userId,
    });
  }

  static fromJson(json: AuthSessionJson) {
    const userId = readAuthString(json.user_id, 'user_id');

    return new AuthSession({
      accountId:
        typeof json.account_id === 'string'
          ? json.account_id
          : userId,
      hasPassword: readAuthBoolean(json.has_password, 'has_password'),
      shouldSetPassword: readAuthBoolean(
        json.should_set_password,
        'should_set_password',
      ),
      token: readAuthString(json.token, 'token'),
      userId,
    });
  }
}

export default AuthSession;
