/**
 * @format
 */

import {
  AUTH_LOGIN_PATH,
  AUTH_PASSWORD_CHANGE_PATH,
  AUTH_PASSWORD_SETUP_PATH,
  AUTH_PROFILE_PATH,
  AUTH_SMS_PATH,
  AuthApi,
  AuthLoginType,
  AuthSession,
  AuthSmsResult,
  AuthUserProfile,
  createAuthBaseURL,
  createAuthHttpClient,
} from '../src/playground/auth';
import type { AuthHttpClient, AuthTokenStore } from '../src/playground/auth';

function createTokenStore(): AuthTokenStore {
  let token: string | undefined;

  return {
    clearToken: () => {
      token = undefined;
    },
    getToken: () => token,
    saveToken: nextToken => {
      token = nextToken;
    },
  };
}

test('auth base URL can be configured by host and port', () => {
  expect(
    createAuthBaseURL({
      host: '192.168.1.23',
      port: '9090',
    }),
  ).toBe('http://192.168.1.23:9090');
});

test('auth base URL can use a full baseURL override', () => {
  expect(
    createAuthBaseURL({
      baseURL: 'https://example.com/api/',
    }),
  ).toBe('https://example.com/api');
});

test('auth http client applies base URL, timeout, and json headers', () => {
  const client = createAuthHttpClient({
    host: '10.0.2.2',
    port: '8088',
    timeoutMs: 1200,
  });

  expect(client.defaults.baseURL).toBe('http://10.0.2.2:8088');
  expect(client.defaults.timeout).toBe(1200);
  expect(client.defaults.headers.Accept).toBe('application/json');
});

test('auth base URL normalizes a configured base path', () => {
  expect(
    createAuthBaseURL({
      basePath: '/api/playground/',
      host: '127.0.0.1',
      port: '',
    }),
  ).toBe('http://127.0.0.1/api/playground');
});

test('auth base URL rejects an empty host', () => {
  expect(() =>
    createAuthBaseURL({
      host: '   ',
    }),
  ).toThrow('Auth API host is required.');
});

test('auth api sends sms with an injected client', async () => {
  const client: AuthHttpClient = {
    get: jest.fn(),
    post: jest.fn().mockResolvedValue({
      data: {
        code: '654321',
        phone: '13800000001',
      },
    }),
    put: jest.fn(),
  };
  const api = new AuthApi({ client, tokenStore: createTokenStore() });

  await expect(api.sendSms('13800000001')).resolves.toEqual(
    new AuthSmsResult({
      code: '654321',
      phone: '13800000001',
    }),
  );
  expect(client.post).toHaveBeenCalledWith(AUTH_SMS_PATH, {
    phone: '13800000001',
  });
});

test('auth api saves login token and carries it when fetching profile', async () => {
  const tokenStore = createTokenStore();
  const client: AuthHttpClient = {
    get: jest.fn().mockResolvedValue({
      data: {
        account_id: 'account-1',
        avatar: 'https://example.com/avatar.png',
        nickname: '产品经理',
        phone: '13800000001',
        user_id: 'user-1',
      },
    }),
    post: jest.fn().mockResolvedValue({
      data: {
        account_id: 'account-1',
        has_password: false,
        should_set_password: true,
        token: 'jwt-token',
        user_id: 'user-1',
      },
    }),
    put: jest.fn(),
  };
  const api = new AuthApi({ client, tokenStore });

  await expect(api.login('13800000001', '123456')).resolves.toEqual(
    new AuthSession({
      accountId: 'account-1',
      hasPassword: false,
      shouldSetPassword: true,
      token: 'jwt-token',
      userId: 'user-1',
    }),
  );
  await expect(api.fetchProfile()).resolves.toEqual(
    new AuthUserProfile({
      accountId: 'account-1',
      avatar: 'https://example.com/avatar.png',
      nickname: '产品经理',
      phone: '13800000001',
      userId: 'user-1',
    }),
  );

  expect(client.post).toHaveBeenCalledWith(AUTH_LOGIN_PATH, {
    code: '123456',
    login_type: AuthLoginType.Sms,
    phone: '13800000001',
  });
  expect(client.get).toHaveBeenCalledWith(AUTH_PROFILE_PATH, {
    headers: {
      Authorization: 'Bearer jwt-token',
    },
  });
});

test('auth api supports password login with the login type enum', async () => {
  const tokenStore = createTokenStore();
  const client: AuthHttpClient = {
    get: jest.fn(),
    post: jest.fn().mockResolvedValue({
      data: {
        account_id: 'account-1',
        has_password: true,
        should_set_password: false,
        token: 'password-jwt-token',
        user_id: 'user-1',
      },
    }),
    put: jest.fn(),
  };
  const api = new AuthApi({ client, tokenStore });

  await expect(
    api.loginWithPassword('13800000001', 'im123456'),
  ).resolves.toEqual(
    new AuthSession({
      accountId: 'account-1',
      hasPassword: true,
      shouldSetPassword: false,
      token: 'password-jwt-token',
      userId: 'user-1',
    }),
  );

  expect(client.post).toHaveBeenCalledWith(AUTH_LOGIN_PATH, {
    login_type: AuthLoginType.Password,
    password: 'im123456',
    phone: '13800000001',
  });
  expect(tokenStore.getToken()).toBe('password-jwt-token');
});

test('auth api does not save a token when password login fails', async () => {
  const tokenStore = createTokenStore();
  const client: AuthHttpClient = {
    get: jest.fn(),
    post: jest.fn().mockRejectedValue(new Error('invalid phone or password')),
    put: jest.fn(),
  };
  const api = new AuthApi({ client, tokenStore });

  await expect(
    api.loginWithPassword('13800000001', 'wrong-password'),
  ).rejects.toThrow('invalid phone or password');

  expect(client.post).toHaveBeenCalledWith(AUTH_LOGIN_PATH, {
    login_type: AuthLoginType.Password,
    password: 'wrong-password',
    phone: '13800000001',
  });
  expect(tokenStore.getToken()).toBeUndefined();
});

test('auth api logout clears the saved token', async () => {
  const tokenStore = createTokenStore();
  const client: AuthHttpClient = {
    get: jest.fn(),
    post: jest.fn().mockResolvedValue({
      data: {
        account_id: 'account-1',
        has_password: false,
        should_set_password: true,
        token: 'jwt-token',
        user_id: 'user-1',
      },
    }),
    put: jest.fn(),
  };
  const api = new AuthApi({ client, tokenStore });

  await api.login('13800000001', '123456');
  expect(tokenStore.getToken()).toBe('jwt-token');

  api.logout();
  expect(tokenStore.getToken()).toBeUndefined();
});

test('auth api rejects profile fetch without a saved token', async () => {
  const client: AuthHttpClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  };
  const api = new AuthApi({ client, tokenStore: createTokenStore() });

  await expect(api.fetchProfile()).rejects.toThrow('Auth token is missing.');
  expect(client.get).not.toHaveBeenCalled();
});

test('auth api sets password with the saved token', async () => {
  const tokenStore = createTokenStore();
  const client: AuthHttpClient = {
    get: jest.fn(),
    post: jest
      .fn()
      .mockResolvedValueOnce({
        data: {
          account_id: 'account-1',
          has_password: false,
          should_set_password: true,
          token: 'jwt-token',
          user_id: 'user-1',
        },
      })
      .mockResolvedValueOnce({
        data: {
          ok: true,
        },
      }),
    put: jest.fn(),
  };
  const api = new AuthApi({ client, tokenStore });

  await api.login('13800000001', '123456');
  await api.setupPassword('new123456');

  expect(client.post).toHaveBeenLastCalledWith(
    AUTH_PASSWORD_SETUP_PATH,
    {
      password: 'new123456',
    },
    {
      headers: {
        Authorization: 'Bearer jwt-token',
      },
    },
  );
});

test('auth api changes password with the saved token', async () => {
  const tokenStore = createTokenStore();
  const client: AuthHttpClient = {
    get: jest.fn(),
    post: jest.fn().mockResolvedValue({
      data: {
        account_id: 'account-1',
        has_password: true,
        should_set_password: false,
        token: 'jwt-token',
        user_id: 'user-1',
      },
    }),
    put: jest.fn().mockResolvedValue({
      data: {
        ok: true,
      },
    }),
  };
  const api = new AuthApi({ client, tokenStore });

  await api.loginWithPassword('13800000001', 'old123456');
  await api.changePassword('old123456', 'new123456');

  expect(client.put).toHaveBeenCalledWith(
    AUTH_PASSWORD_CHANGE_PATH,
    {
      new_password: 'new123456',
      old_password: 'old123456',
    },
    {
      headers: {
        Authorization: 'Bearer jwt-token',
      },
    },
  );
});

test('auth api rejects password updates without a token', async () => {
  const client: AuthHttpClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  };
  const api = new AuthApi({ client, tokenStore: createTokenStore() });

  await expect(api.setupPassword('new123456')).rejects.toThrow(
    'Auth token is missing.',
  );
  await expect(
    api.changePassword('old123456', 'new123456'),
  ).rejects.toThrow('Auth token is missing.');
  expect(client.post).not.toHaveBeenCalled();
  expect(client.put).not.toHaveBeenCalled();
});
