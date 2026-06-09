/**
 * @format
 */

import {
  AuthLoginType,
  AuthSession,
  AuthSmsResult,
  AuthUserProfile,
  clearAuthToken,
  getAuthToken,
  readAuthLoginType,
  saveAuthToken,
} from '../src/playground/auth';

afterEach(() => {
  clearAuthToken();
});

test('auth login type enum maps supported login modes', () => {
  expect(AuthLoginType.Sms).toBe('sms');
  expect(AuthLoginType.Password).toBe('password');
  expect(readAuthLoginType('sms')).toBe(AuthLoginType.Sms);
  expect(readAuthLoginType('password')).toBe(AuthLoginType.Password);
});

test('auth login type rejects unsupported values', () => {
  expect(() => readAuthLoginType('magic')).toThrow(
    'Auth login type must be sms or password.',
  );
});

test('auth sms result maps backend response fields', () => {
  expect(
    AuthSmsResult.fromJson({
      code: '123456',
      phone: '13800000001',
    }),
  ).toEqual(
    new AuthSmsResult({
      code: '123456',
      phone: '13800000001',
    }),
  );
});

test('auth sms result rejects invalid backend fields', () => {
  expect(() =>
    AuthSmsResult.fromJson({
      code: 123456,
      phone: '13800000001',
    }),
  ).toThrow('Auth field "code" must be a string.');

  expect(() =>
    AuthSmsResult.fromJson({
      code: '123456',
    }),
  ).toThrow('Auth field "phone" must be a string.');
});

test('auth session maps jwt token and snake case user id', () => {
  expect(
    AuthSession.fromJson({
      token: 'jwt-token',
      user_id: 'user-1',
    }),
  ).toEqual(
    new AuthSession({
      token: 'jwt-token',
      userId: 'user-1',
    }),
  );
});

test('auth session rejects invalid token payloads', () => {
  expect(() =>
    AuthSession.fromJson({
      user_id: 'user-1',
    }),
  ).toThrow('Auth field "token" must be a string.');

  expect(() =>
    AuthSession.fromJson({
      token: 'jwt-token',
      user_id: 1,
    }),
  ).toThrow('Auth field "user_id" must be a string.');
});

test('auth user profile maps backend response fields', () => {
  expect(
    AuthUserProfile.fromJson({
      avatar: 'https://example.com/avatar.png',
      nickname: '产品经理',
      phone: '13800000001',
      user_id: 'user-1',
    }),
  ).toEqual(
    new AuthUserProfile({
      avatar: 'https://example.com/avatar.png',
      nickname: '产品经理',
      phone: '13800000001',
      userId: 'user-1',
    }),
  );
});

test('auth user profile exposes a stable avatar initial', () => {
  expect(
    new AuthUserProfile({
      avatar: '',
      nickname: 'Alice',
      phone: '13800000001',
      userId: 'user-1',
    }).avatarInitial,
  ).toBe('A');

  expect(
    new AuthUserProfile({
      avatar: '',
      nickname: '   ',
      phone: '13800000001',
      userId: 'user-1',
    }).avatarInitial,
  ).toBe('1');

  expect(
    new AuthUserProfile({
      avatar: '',
      nickname: '   ',
      phone: '   ',
      userId: 'user-1',
    }).avatarInitial,
  ).toBe('U');
});

test('auth user profile rejects invalid backend fields', () => {
  expect(() =>
    AuthUserProfile.fromJson({
      avatar: 'https://example.com/avatar.png',
      nickname: '产品经理',
      phone: '13800000001',
    }),
  ).toThrow('Auth field "user_id" must be a string.');

  expect(() =>
    AuthUserProfile.fromJson({
      avatar: 'https://example.com/avatar.png',
      nickname: null,
      phone: '13800000001',
      user_id: 'user-1',
    }),
  ).toThrow('Auth field "nickname" must be a string.');
});

test('playground auth token store saves, reads, and clears token', () => {
  expect(getAuthToken()).toBeUndefined();

  saveAuthToken('jwt-token');
  expect(getAuthToken()).toBe('jwt-token');

  clearAuthToken();
  expect(getAuthToken()).toBeUndefined();
});
