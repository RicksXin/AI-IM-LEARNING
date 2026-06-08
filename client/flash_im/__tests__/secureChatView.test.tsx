/**
 * @format
 */

import React from 'react';
import { ScrollView } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import AuthUserProfile from '../src/playground/auth/model/AuthUserProfile';
import { createSecureChatMessage } from '../src/playground/secure_chat';
import SecureChatScreen from '../src/playground/secure_chat/view/SecureChatScreen';

jest.mock('react-native-safe-area-context', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) =>
      ReactMock.createElement(View, props, children),
  };
});

const baseProps = {
  code: '',
  countdownSeconds: 0,
  draft: '',
  endpointLabel: 'ws://127.0.0.1:8080/chat_room',
  host: '127.0.0.1',
  isLoggingIn: false,
  isSendingCode: false,
  lastHeartbeatAt: undefined,
  messages: [createSecureChatMessage('system', 'ready', { id: 'm1' })],
  phone: '13800000001',
  port: '8080',
  status: 'connected' as const,
  onBack: jest.fn(),
  onCodeChange: jest.fn(),
  onDraftChange: jest.fn(),
  onHostChange: jest.fn(),
  onLogin: jest.fn(),
  onLogout: jest.fn(),
  onPhoneChange: jest.fn(),
  onPortChange: jest.fn(),
  onReconnect: jest.fn(),
  onSendCode: jest.fn(),
  onSendMessage: jest.fn(),
  onTabChange: jest.fn(),
};

test('secure chat screen renders chat tab and sends messages', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  const onSendMessage = jest.fn();

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SecureChatScreen
        {...baseProps}
        activeTab="chat"
        draft="hello"
        messages={[
          createSecureChatMessage('incoming', '欢迎进入聊天室', {
            id: 'm1',
            senderName: '系统',
          }),
          createSecureChatMessage('outgoing', '我发出的消息', {
            deliveryStatus: 'delivered',
            id: 'm2',
            senderName: '我',
          }),
        ]}
        onSendMessage={onSendMessage}
      />,
    );
  });

  const output = JSON.stringify(renderer?.toJSON());
  expect(output).toContain('认证 IM');
  expect(output).toContain('认证聊天室');
  expect(output).toContain('欢迎进入聊天室');
  expect(output).toContain('已送达');

  const sendButton = renderer?.root.findByProps({
    accessibilityLabel: '发送认证聊天室消息',
  });
  await ReactTestRenderer.act(async () => {
    sendButton?.props.onPress();
  });

  expect(onSendMessage).toHaveBeenCalledTimes(1);
});

test('secure chat room keeps the latest message visible', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SecureChatScreen
        {...baseProps}
        activeTab="chat"
        messages={[
          createSecureChatMessage('system', 'ready', { id: 'm1' }),
          createSecureChatMessage('outgoing', '最新消息', { id: 'm2' }),
        ]}
      />,
    );
  });

  const scrollViews = renderer?.root.findAllByType(ScrollView);
  const messageList = scrollViews?.find(
    node => typeof node.props.onContentSizeChange === 'function',
  );

  expect(messageList?.props.onContentSizeChange).toEqual(expect.any(Function));
  expect(messageList?.props.onLayout).toEqual(expect.any(Function));
  expect(JSON.stringify(renderer?.toJSON())).toContain('最新消息');
});

test('secure chat screen renders my tab and login action', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  const onLogin = jest.fn();
  const onSendCode = jest.fn();

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SecureChatScreen
        {...baseProps}
        activeTab="me"
        onLogin={onLogin}
        onSendCode={onSendCode}
      />,
    );
  });

  const output = JSON.stringify(renderer?.toJSON());
  expect(output).toContain('我的');
  expect(output).toContain('手机号登录');

  const sendCodeButton = renderer?.root.findByProps({
    accessibilityLabel: '发送认证聊天室验证码',
  });
  const loginButton = renderer?.root.findByProps({
    accessibilityLabel: '登录并进入认证聊天室',
  });

  await ReactTestRenderer.act(async () => {
    sendCodeButton?.props.onPress();
    loginButton?.props.onPress();
  });

  expect(onSendCode).toHaveBeenCalledTimes(1);
  expect(onLogin).toHaveBeenCalledTimes(1);
});

test('secure chat screen renders profile and logout action', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  const onLogout = jest.fn();
  const profile = new AuthUserProfile({
    avatar: 'https://example.com/avatar.png',
    nickname: '13800000001',
    phone: '13800000001',
    userId: 'u_000001',
  });

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SecureChatScreen
        {...baseProps}
        activeTab="me"
        lastHeartbeatAt="10:00:00"
        profile={profile}
        tokenPreview="jwt...token"
        onLogout={onLogout}
      />,
    );
  });

  const output = JSON.stringify(renderer?.toJSON());
  expect(output).toContain('u_000001');
  expect(output).toContain('jwt...token');
  expect(output).toContain('10:00:00');

  const logoutButton = renderer?.root.findByProps({
    accessibilityLabel: '退出认证聊天室',
  });
  await ReactTestRenderer.act(async () => {
    logoutButton?.props.onPress();
  });

  expect(onLogout).toHaveBeenCalledTimes(1);
});
