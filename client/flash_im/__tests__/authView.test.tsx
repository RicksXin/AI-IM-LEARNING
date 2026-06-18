/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { AuthLoginType } from '../src/playground/auth';
import AuthSession from '../src/playground/auth/model/AuthSession';
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
  endpointLabel: 'http://127.0.0.1:8080/auth/profile',
  host: '127.0.0.1',
  isLoggingIn: false,
  isSendingCode: false,
  loginType: AuthLoginType.Sms,
  password: 'im123456',
  phone: '13800000001',
  port: '8080',
  onBack: jest.fn(),
  onCodeChange: jest.fn(),
  onHostChange: jest.fn(),
  onLogin: jest.fn(),
  onLoginTypeChange: jest.fn(),
  onLogout: jest.fn(),
  onPasswordChange: jest.fn(),
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
  expect(output).toContain('http://127.0.0.1:8080/auth/profile');

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

test('auth screen can render the password login mode', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  const onLoginTypeChange = jest.fn();
  const onPasswordChange = jest.fn();

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <AuthScreen
        {...baseProps}
        loginType={AuthLoginType.Password}
        onLoginTypeChange={onLoginTypeChange}
        onPasswordChange={onPasswordChange}
      />,
    );
  });

  const output = JSON.stringify(renderer?.toJSON());
  expect(output).toContain('手机号密码登录');
  expect(output).not.toContain('发送验证码');

  const passwordInput = renderer?.root.findByProps({
    accessibilityLabel: '登录密码输入',
  });
  await ReactTestRenderer.act(async () => {
    passwordInput?.props.onChangeText('demo123456');
  });

  const smsTab = renderer?.root.findByProps({
    accessibilityLabel: '切换到验证码登录',
  });
  await ReactTestRenderer.act(async () => {
    smsTab?.props.onPress();
  });

  expect(onPasswordChange).toHaveBeenCalledWith('demo123456');
  expect(onLoginTypeChange).toHaveBeenCalledWith(AuthLoginType.Sms);
});

test('auth screen toggles password visibility with the eye button', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <AuthScreen {...baseProps} loginType={AuthLoginType.Password} />,
    );
  });

  const passwordInput = renderer?.root.findByProps({
    accessibilityLabel: '登录密码输入',
  });
  expect(passwordInput?.props.secureTextEntry).toBe(true);

  const showPasswordButton = renderer?.root.findByProps({
    accessibilityLabel: '显示登录密码',
  });
  await ReactTestRenderer.act(async () => {
    showPasswordButton?.props.onPress();
  });

  const visiblePasswordInput = renderer?.root.findByProps({
    accessibilityLabel: '登录密码输入',
  });
  expect(visiblePasswordInput?.props.secureTextEntry).toBe(false);

  const hidePasswordButton = renderer?.root.findByProps({
    accessibilityLabel: '隐藏登录密码',
  });
  await ReactTestRenderer.act(async () => {
    hidePasswordButton?.props.onPress();
  });

  const hiddenPasswordInput = renderer?.root.findByProps({
    accessibilityLabel: '登录密码输入',
  });
  expect(hiddenPasswordInput?.props.secureTextEntry).toBe(true);
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
    accountId: 'user-1',
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
        session={
          new AuthSession({
            accountId: 'user-1',
            hasPassword: true,
            shouldSetPassword: false,
            token: 'jwt-token',
            userId: 'user-1',
          })
        }
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
  expect(output).toContain('已设置登录密码');

  const logoutButton = renderer?.root.findByProps({
    accessibilityLabel: '退出用户认证',
  });
  await ReactTestRenderer.act(async () => {
    logoutButton?.props.onPress();
  });

  expect(onLogout).toHaveBeenCalledTimes(1);
});

test('auth screen renders password setup panel after sms login', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  const onSetupPassword = jest.fn();
  const onSetupPasswordChange = jest.fn();
  const onSetupPasswordConfirmChange = jest.fn();
  const profile = new AuthUserProfile({
    accountId: 'user-1',
    avatar: 'https://example.com/avatar.png',
    nickname: '13800000001',
    phone: '13800000001',
    userId: 'user-1',
  });

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <AuthScreen
        {...baseProps}
        passwordSetupError="两次输入的密码不一致。"
        profile={profile}
        session={
          new AuthSession({
            accountId: 'user-1',
            hasPassword: false,
            shouldSetPassword: true,
            token: 'jwt-token',
            userId: 'user-1',
          })
        }
        setupPassword="new123456"
        setupPasswordConfirm="new12345"
        onSetupPassword={onSetupPassword}
        onSetupPasswordChange={onSetupPasswordChange}
        onSetupPasswordConfirmChange={onSetupPasswordConfirmChange}
      />,
    );
  });

  const output = JSON.stringify(renderer?.toJSON());
  expect(output).toContain('设置登录密码');
  expect(output).toContain('未设置登录密码');
  expect(output).toContain('两次输入的密码不一致。');

  const passwordInput = renderer?.root.findByProps({
    accessibilityLabel: '设置密码输入',
  });
  const confirmInput = renderer?.root.findByProps({
    accessibilityLabel: '确认设置密码输入',
  });
  const submitButton = renderer?.root.findByProps({
    accessibilityLabel: '保存登录密码',
  });

  await ReactTestRenderer.act(async () => {
    passwordInput?.props.onChangeText('new123456');
    confirmInput?.props.onChangeText('new123456');
    submitButton?.props.onPress();
  });

  expect(onSetupPasswordChange).toHaveBeenCalledWith('new123456');
  expect(onSetupPasswordConfirmChange).toHaveBeenCalledWith('new123456');
  expect(onSetupPassword).toHaveBeenCalledTimes(1);
});

test('auth screen toggles setup password visibility with the eye button', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
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
        session={
          new AuthSession({
            accountId: 'user-1',
            hasPassword: false,
            shouldSetPassword: true,
            token: 'jwt-token',
            userId: 'user-1',
          })
        }
      />,
    );
  });

  const passwordInput = renderer?.root.findByProps({
    accessibilityLabel: '设置密码输入',
  });
  expect(passwordInput?.props.secureTextEntry).toBe(true);

  const showPasswordButton = renderer?.root.findByProps({
    accessibilityLabel: '显示设置密码',
  });
  await ReactTestRenderer.act(async () => {
    showPasswordButton?.props.onPress();
  });

  const visiblePasswordInput = renderer?.root.findByProps({
    accessibilityLabel: '设置密码输入',
  });
  const visibleConfirmInput = renderer?.root.findByProps({
    accessibilityLabel: '确认设置密码输入',
  });
  expect(visiblePasswordInput?.props.secureTextEntry).toBe(false);
  expect(visibleConfirmInput?.props.secureTextEntry).toBe(false);
});
