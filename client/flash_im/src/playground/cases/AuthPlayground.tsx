import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AUTH_PROFILE_PATH,
  AuthApi,
  AuthLoginType,
  createAuthBaseURL,
  defaultAuthApiConfig,
  getAuthToken,
} from '../auth';
import type AuthUserProfile from '../auth/model/AuthUserProfile';
import { getDefaultPlaygroundHost } from '../config/playgroundNetwork';
import AuthScreen from '../auth/view/AuthScreen';

type AuthPlaygroundProps = {
  onBack: () => void;
};

const SMS_COUNTDOWN_SECONDS = 60;

function AuthPlayground({ onBack }: AuthPlaygroundProps) {
  const [host, setHost] = useState(getDefaultPlaygroundHost());
  const [port, setPort] = useState(String(defaultAuthApiConfig.port));
  const [phone, setPhone] = useState('13800000001');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('im123456');
  const [loginType, setLoginType] = useState(AuthLoginType.Sms);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [statusMessage, setStatusMessage] = useState<string | undefined>(
    '启动后端后，先发送验证码；密码登录可用 13800000001 / im123456。',
  );
  const [profile, setProfile] = useState<AuthUserProfile | undefined>();

  const endpointLabel = useMemo(() => {
    try {
      return `${createAuthBaseURL({ host, port })}${AUTH_PROFILE_PATH}`;
    } catch {
      return '请输入认证后端地址';
    }
  }, [host, port]);

  const token = getAuthToken();
  const tokenPreview = token
    ? token.length <= 24
      ? token
      : `${token.slice(0, 12)}...${token.slice(-8)}`
    : undefined;

  const createApi = useCallback(() => {
    return new AuthApi({
      config: {
        host,
        port,
      },
    });
  }, [host, port]);

  const handleSendCode = useCallback(async () => {
    if (!phone.trim()) {
      setErrorMessage('请输入手机号。');
      return;
    }

    setIsSendingCode(true);
    setErrorMessage(undefined);
    setStatusMessage(undefined);

    try {
      const result = await createApi().sendSms(phone.trim());

      setCode(result.code);
      setCountdownSeconds(SMS_COUNTDOWN_SECONDS);
      setStatusMessage(`验证码已返回并填入：${result.code}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '验证码发送失败',
      );
    } finally {
      setIsSendingCode(false);
    }
  }, [createApi, phone]);

  const handleLogin = useCallback(async () => {
    if (!phone.trim()) {
      setErrorMessage('请输入手机号。');
      return;
    }

    if (loginType === AuthLoginType.Sms && !code.trim()) {
      setErrorMessage('请输入验证码。');
      return;
    }

    if (loginType === AuthLoginType.Password && !password.trim()) {
      setErrorMessage('请输入密码。');
      return;
    }

    setIsLoggingIn(true);
    setErrorMessage(undefined);
    setStatusMessage(undefined);

    try {
      const api = createApi();

      if (loginType === AuthLoginType.Password) {
        await api.loginWithPassword(phone.trim(), password.trim());
      } else {
        await api.loginWithSms(phone.trim(), code.trim());
      }
      const nextProfile = await api.fetchProfile();

      setProfile(nextProfile);
      setStatusMessage('登录成功，Token 已保存。');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '登录失败');
    } finally {
      setIsLoggingIn(false);
    }
  }, [code, createApi, loginType, password, phone]);

  const handleLogout = useCallback(() => {
    createApi().logout();
    setProfile(undefined);
    setCode('');
    setErrorMessage(undefined);
    setStatusMessage('已退出登录，Token 已清除。');
  }, [createApi]);

  const handleLoginTypeChange = useCallback((nextLoginType: AuthLoginType) => {
    setLoginType(nextLoginType);
    setErrorMessage(undefined);
    setStatusMessage(
      nextLoginType === AuthLoginType.Password
        ? '内置测试账号：13800000001 / im123456。'
        : '启动后端后，先发送验证码。',
    );
  }, []);

  useEffect(() => {
    if (countdownSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCountdownSeconds(current => Math.max(current - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownSeconds]);

  return (
    <AuthScreen
      code={code}
      countdownSeconds={countdownSeconds}
      endpointLabel={endpointLabel}
      errorMessage={errorMessage}
      host={host}
      isLoggingIn={isLoggingIn}
      isSendingCode={isSendingCode}
      loginType={loginType}
      password={password}
      phone={phone}
      port={port}
      profile={profile}
      statusMessage={statusMessage}
      tokenPreview={tokenPreview}
      onBack={onBack}
      onCodeChange={setCode}
      onHostChange={setHost}
      onLogin={handleLogin}
      onLoginTypeChange={handleLoginTypeChange}
      onLogout={handleLogout}
      onPasswordChange={setPassword}
      onPhoneChange={setPhone}
      onPortChange={setPort}
      onSendCode={handleSendCode}
    />
  );
}

export default AuthPlayground;
