import { readAuthString } from './AuthJson';

export type AuthSessionJson = {
  token?: unknown;
  user_id?: unknown;
};

export type AuthSessionProps = {
  token: string;
  userId: string;
};

class AuthSession {
  readonly token: string;
  readonly userId: string;

  constructor(props: AuthSessionProps) {
    this.token = props.token;
    this.userId = props.userId;
  }

  static fromJson(json: AuthSessionJson) {
    return new AuthSession({
      token: readAuthString(json.token, 'token'),
      userId: readAuthString(json.user_id, 'user_id'),
    });
  }
}

export default AuthSession;
