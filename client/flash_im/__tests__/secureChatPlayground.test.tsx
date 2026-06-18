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
  AuthLoginType,
  clearAuthToken,
} from '../src/playground/auth';
import SecureChatPlayground from '../src/playground/cases/SecureChatPlayground';

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

const originalWebSocket = global.WebSocket;

class FakeWebSocket {
  static CLOSED = 3;
  static CLOSING = 2;
  static OPEN = 1;

  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  readyState = 0;
  sentMessages: string[] = [];
  url: string;

  constructor(url: string) {
    this.url = url;
    fakeSockets.push(this);
  }

  open() {
    this.readyState = WebSocket.OPEN;
    this.onopen?.({} as Event);
  }

  receive(data: string) {
    this.onmessage?.({ data } as MessageEvent);
  }

  send(message: string) {
    this.sentMessages.push(message);
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.({ code: 1000 } as CloseEvent);
  }
}

type FakeAuthClient = {
  get: jest.Mock;
  post: jest.Mock;
};

let fakeSockets: FakeWebSocket[] = [];

function mockAuthHttpClient(client: FakeAuthClient) {
  const mockedCreate = axios.create as jest.MockedFunction<typeof axios.create>;

  mockedCreate.mockReturnValue(
    client as unknown as ReturnType<typeof axios.create>,
  );
}

function createSuccessfulAuthClient(): FakeAuthClient {
  return {
    get: jest.fn((url: string) => {
      if (url === AUTH_PROFILE_PATH) {
        return Promise.resolve({
          data: {
            account_id: 'u_000001',
            avatar: 'https://example.com/avatar.png',
            nickname: '13800000001',
            phone: '13800000001',
            user_id: 'u_000001',
          },
        });
      }

      return Promise.reject(new Error(`Unexpected auth get path: ${url}`));
    }),
    post: jest.fn((url: string, data: { code?: string; phone?: string }) => {
      if (url === AUTH_SMS_PATH) {
        return Promise.resolve({
          data: {
            code: '135790',
            phone: data.phone,
          },
        });
      }

      if (url === AUTH_LOGIN_PATH) {
        return Promise.resolve({
          data: {
            account_id: 'u_000001',
            has_password: true,
            should_set_password: false,
            token: 'jwt-token-for-secure-chat',
            user_id: 'u_000001',
          },
        });
      }

      return Promise.reject(new Error(`Unexpected auth post path: ${url}`));
    }),
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  fakeSockets = [];
  clearAuthToken();
  jest.clearAllMocks();
  global.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
});

afterEach(() => {
  clearAuthToken();
  global.WebSocket = originalWebSocket;
  jest.useRealTimers();
});

test('secure chat playground logs in, authenticates websocket, sends chat, and logs out', async () => {
  const client = createSuccessfulAuthClient();
  mockAuthHttpClient(client);
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SecureChatPlayground onBack={jest.fn()} />,
    );
  });

  const meTab = renderer?.root.findByProps({
    accessibilityLabel: '切换到我的',
  });
  await ReactTestRenderer.act(async () => {
    meTab?.props.onPress();
  });

  const sendCodeButton = renderer?.root.findByProps({
    accessibilityLabel: '发送认证聊天室验证码',
  });
  await ReactTestRenderer.act(async () => {
    await sendCodeButton?.props.onPress();
  });

  expect(client.post).toHaveBeenNthCalledWith(1, AUTH_SMS_PATH, {
    phone: '13800000001',
  });
  expect(
    renderer?.root.findByProps({
      accessibilityLabel: '认证聊天室验证码输入',
    }).props.value,
  ).toBe('135790');

  const loginButton = renderer?.root.findByProps({
    accessibilityLabel: '登录并进入认证聊天室',
  });
  await ReactTestRenderer.act(async () => {
    await loginButton?.props.onPress();
  });

  expect(client.post).toHaveBeenNthCalledWith(2, AUTH_LOGIN_PATH, {
    code: '135790',
    login_type: AuthLoginType.Sms,
    phone: '13800000001',
  });
  expect(client.get).toHaveBeenCalledWith(AUTH_PROFILE_PATH, {
    headers: {
      Authorization: 'Bearer jwt-token-for-secure-chat',
    },
  });
  expect(fakeSockets).toHaveLength(1);
  expect(fakeSockets[0].url).toBe('ws://127.0.0.1:8080/chat_room');

  await ReactTestRenderer.act(async () => {
    fakeSockets[0].open();
  });

  expect(fakeSockets[0].sentMessages).toContain(
    '{"token":"jwt-token-for-secure-chat","type":"auth"}',
  );

  await ReactTestRenderer.act(async () => {
    fakeSockets[0].receive('{"type":"auth_required","message":"send auth"}');
    fakeSockets[0].receive(
      '{"type":"auth_success","user_id":"u_000001","message":"ok"}',
    );
  });

  expect(JSON.stringify(renderer?.toJSON())).toContain('已连接');
  expect(JSON.stringify(renderer?.toJSON())).toContain(
    'WebSocket JWT 认证成功。',
  );

  const messageInput = renderer?.root.findByProps({
    accessibilityLabel: '认证聊天室消息输入',
  });
  await ReactTestRenderer.act(async () => {
    messageInput?.props.onChangeText('你好，认证聊天室');
  });

  const sendMessageButton = renderer?.root.findByProps({
    accessibilityLabel: '发送认证聊天室消息',
  });
  await ReactTestRenderer.act(async () => {
    sendMessageButton?.props.onPress();
  });

  expect(fakeSockets[0].sentMessages).toContain(
    '{"content":"你好，认证聊天室","type":"chat"}',
  );
  expect(JSON.stringify(renderer?.toJSON())).toContain('发送中');

  await ReactTestRenderer.act(async () => {
    fakeSockets[0].receive(
      '{"type":"chat","user_id":"u_000001","nickname":"13800000001","content":"你好，认证聊天室","time":"10:00:00"}',
    );
  });

  expect(JSON.stringify(renderer?.toJSON())).toContain('你好，认证聊天室');
  expect(JSON.stringify(renderer?.toJSON())).toContain('已送达');
  expect(JSON.stringify(renderer?.toJSON())).not.toContain('服务端回包');

  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(10000);
  });

  expect(fakeSockets[0].sentMessages).toContain('{"type":"ping"}');

  await ReactTestRenderer.act(async () => {
    meTab?.props.onPress();
  });

  const logoutButton = renderer?.root.findByProps({
    accessibilityLabel: '退出认证聊天室',
  });

  await ReactTestRenderer.act(async () => {
    logoutButton?.props.onPress();
  });

  expect(JSON.stringify(renderer?.toJSON())).toContain('未连接');
  await ReactTestRenderer.act(async () => {
    renderer?.unmount();
  });
});
