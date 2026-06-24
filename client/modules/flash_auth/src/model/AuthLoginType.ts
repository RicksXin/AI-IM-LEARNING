export enum AuthLoginType {
  Sms = 'sms',
  Password = 'password',
}

export function readAuthLoginType(value: unknown) {
  if (value === AuthLoginType.Sms || value === AuthLoginType.Password) {
    return value;
  }

  throw new Error('Auth login type must be sms or password.');
}
