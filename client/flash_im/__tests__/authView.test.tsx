/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import AuthUserProfile from '../src/playground/auth/model/AuthUserProfile';
import AuthScreen from '../src/playground/auth/view/AuthScreen';

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
  endpointLabel: 'http://127.0.0.1:8080/user/profile',
  host: '127.0.0.1',
  isLoggingIn: false,
  isSendingCode: false,
  phone: '13800000001',
  port: '8080',
  onBack: jest.fn(),
  onCodeChange: jest.fn(),
  onHostChange: jest.fn(),
  onLogin: jest.fn(),
  onLogout: jest.fn(),
  onPhoneChange: jest.fn(),
  onPortChange: jest.fn(),
  onSendCode: jest.fn(),
};

test('auth screen renders the login form and actions', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  const onSendCode = jest.fn();
  const onLogin = jest.fn();

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <AuthScreen
        {...baseProps}
        code="123456"
        onLogin={onLogin}
        onSendCode={onSendCode}
      />,
    );
  });

  const output = JSON.stringify(renderer?.toJSON());
  expect(output).toContain('用户认证');
  expect(output).toContain('手机号验证码登录');
  expect(output).toContain('http://127.0.0.1:8080/user/profile');

  const sendCodeButton = renderer?.root.findByProps({
    accessibilityLabel: '发送登录验证码',
  });
  const loginButton = renderer?.root.findByProps({
    accessibilityLabel: '登录用户认证',
  });

  await ReactTestRenderer.act(async () => {
    sendCodeButton?.props.onPress();
    loginButton?.props.onPress();
  });

  expect(onSendCode).toHaveBeenCalledTimes(1);
  expect(onLogin).toHaveBeenCalledTimes(1);
});

test('auth screen shows the sms countdown state', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <AuthScreen {...baseProps} countdownSeconds={60} />,
    );
  });

  expect(JSON.stringify(renderer?.toJSON())).toContain('重新发送 60s');
});

test('auth screen renders profile and logout action after login', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  const onLogout = jest.fn();
  const profile = new AuthUserProfile({
    avatar: 'https://example.com/avatar.png',
    nickname: '13800000001',
    phone: '13800000001',
    userId: 'user-1',
  });

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <AuthScreen
        {...baseProps}
        profile={profile}
        tokenPreview="jwt...token"
        onLogout={onLogout}
      />,
    );
  });

  const output = JSON.stringify(renderer?.toJSON());
  expect(output).toContain('已登录');
  expect(output).toContain('13800000001');
  expect(output).toContain('user-1');
  expect(output).toContain('jwt...token');

  const logoutButton = renderer?.root.findByProps({
    accessibilityLabel: '退出用户认证',
  });
  await ReactTestRenderer.act(async () => {
    logoutButton?.props.onPress();
  });

  expect(onLogout).toHaveBeenCalledTimes(1);
});
