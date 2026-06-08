/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import axios from 'axios';
import {
  AUTH_LOGIN_PATH,
  AUTH_PROFILE_PATH,
  AUTH_SMS_PATH,
  clearAuthToken,
  getAuthToken,
} from '../src/playground/auth';
import AuthPlayground from '../src/playground/cases/AuthPlayground';

jest.mock('axios', () => ({
  create: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) =>
      ReactMock.createElement(View, props, children),
  };
});

type FakeAuthClient = {
  get: jest.Mock;
  post: jest.Mock;
};

function mockAuthHttpClient(client: FakeAuthClient) {
  const mockedCreate = axios.create as jest.MockedFunction<
    typeof axios.create
  >;

  mockedCreate.mockReturnValue(
    client as unknown as ReturnType<typeof axios.create>,
  );
}

function createSuccessfulClient(): FakeAuthClient {
  return {
    get: jest.fn().mockResolvedValue({
      data: {
        avatar: 'https://example.com/avatar.png',
        nickname: '13800000001',
        phone: '13800000001',
        user_id: 'u_000001',
      },
    }),
    post: jest.fn((url: string, data: { code?: string; phone?: string }) => {
      if (url === AUTH_SMS_PATH) {
        return Promise.resolve({
          data: {
            code: '246810',
            phone: data.phone,
          },
        });
      }

      if (url === AUTH_LOGIN_PATH) {
        return Promise.resolve({
          data: {
            token: 'jwt-token-for-auth-playground',
            user_id: 'u_000001',
          },
        });
      }

      return Promise.reject(new Error(`Unexpected auth path: ${url}`));
    }),
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  clearAuthToken();
  jest.clearAllMocks();
});

afterEach(() => {
  clearAuthToken();
  jest.useRealTimers();
});

test('auth playground sends sms, fills code, logs in, fetches profile, and logs out', async () => {
  const client = createSuccessfulClient();
  mockAuthHttpClient(client);
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<AuthPlayground onBack={jest.fn()} />);
  });

  const sendCodeButton = renderer?.root.findByProps({
    accessibilityLabel: '发送登录验证码',
  });

  await ReactTestRenderer.act(async () => {
    await sendCodeButton?.props.onPress();
  });

  expect(client.post).toHaveBeenNthCalledWith(1, AUTH_SMS_PATH, {
    phone: '13800000001',
  });
  expect(
    renderer?.root.findByProps({
      accessibilityLabel: '登录验证码输入',
    }).props.value,
  ).toBe('246810');
  expect(JSON.stringify(renderer?.toJSON())).toContain(
    '验证码已返回并填入：246810',
  );
  expect(JSON.stringify(renderer?.toJSON())).toContain('重新发送 60s');

  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(1000);
  });

  expect(JSON.stringify(renderer?.toJSON())).toContain('重新发送 59s');

  const loginButton = renderer?.root.findByProps({
    accessibilityLabel: '登录用户认证',
  });

  await ReactTestRenderer.act(async () => {
    await loginButton?.props.onPress();
  });

  expect(client.post).toHaveBeenNthCalledWith(2, AUTH_LOGIN_PATH, {
    code: '246810',
    phone: '13800000001',
  });
  expect(client.get).toHaveBeenCalledWith(AUTH_PROFILE_PATH, {
    headers: {
      Authorization: 'Bearer jwt-token-for-auth-playground',
    },
  });
  expect(getAuthToken()).toBe('jwt-token-for-auth-playground');
  expect(JSON.stringify(renderer?.toJSON())).toContain('已登录');
  expect(JSON.stringify(renderer?.toJSON())).toContain('u_000001');

  const logoutButton = renderer?.root.findByProps({
    accessibilityLabel: '退出用户认证',
  });

  await ReactTestRenderer.act(async () => {
    logoutButton?.props.onPress();
  });

  expect(getAuthToken()).toBeUndefined();
  expect(JSON.stringify(renderer?.toJSON())).toContain('未登录');
  expect(JSON.stringify(renderer?.toJSON())).toContain(
    '已退出登录，Token 已清除。',
  );
});

test('auth playground validates phone before sending sms', async () => {
  const client = createSuccessfulClient();
  mockAuthHttpClient(client);
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<AuthPlayground onBack={jest.fn()} />);
  });

  const phoneInput = renderer?.root.findByProps({
    accessibilityLabel: '登录手机号输入',
  });

  await ReactTestRenderer.act(async () => {
    phoneInput?.props.onChangeText('   ');
  });

  const sendCodeButton = renderer?.root.findByProps({
    accessibilityLabel: '发送登录验证码',
  });

  await ReactTestRenderer.act(async () => {
    await sendCodeButton?.props.onPress();
  });

  expect(client.post).not.toHaveBeenCalled();
  expect(JSON.stringify(renderer?.toJSON())).toContain('请输入手机号。');
});

test('auth playground validates code before logging in', async () => {
  const client = createSuccessfulClient();
  mockAuthHttpClient(client);
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<AuthPlayground onBack={jest.fn()} />);
  });

  const loginButton = renderer?.root.findByProps({
    accessibilityLabel: '登录用户认证',
  });

  await ReactTestRenderer.act(async () => {
    await loginButton?.props.onPress();
  });

  expect(client.post).not.toHaveBeenCalled();
  expect(client.get).not.toHaveBeenCalled();
  expect(JSON.stringify(renderer?.toJSON())).toContain('请输入验证码。');
});

test('auth playground surfaces sms request errors', async () => {
  const client: FakeAuthClient = {
    get: jest.fn(),
    post: jest
      .fn()
      .mockRejectedValue(new Error('Request failed with status code 404')),
  };
  mockAuthHttpClient(client);
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<AuthPlayground onBack={jest.fn()} />);
  });

  const sendCodeButton = renderer?.root.findByProps({
    accessibilityLabel: '发送登录验证码',
  });

  await ReactTestRenderer.act(async () => {
    await sendCodeButton?.props.onPress();
  });

  expect(client.post).toHaveBeenCalledWith(AUTH_SMS_PATH, {
    phone: '13800000001',
  });
  expect(JSON.stringify(renderer?.toJSON())).toContain(
    'Request failed with status code 404',
  );
});
