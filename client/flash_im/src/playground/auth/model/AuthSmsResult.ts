import { readAuthString } from './AuthJson';

export type AuthSmsResultJson = {
  code?: unknown;
  phone?: unknown;
};

export type AuthSmsResultProps = {
  code: string;
  phone: string;
};

class AuthSmsResult {
  readonly code: string;
  readonly phone: string;

  constructor(props: AuthSmsResultProps) {
    this.code = props.code;
    this.phone = props.phone;
  }

  static fromJson(json: AuthSmsResultJson) {
    return new AuthSmsResult({
      code: readAuthString(json.code, 'code'),
      phone: readAuthString(json.phone, 'phone'),
    });
  }
}

export default AuthSmsResult;
