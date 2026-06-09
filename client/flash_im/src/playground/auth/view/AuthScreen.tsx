import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthLoginType } from '../model/AuthLoginType';
import type AuthUserProfile from '../model/AuthUserProfile';
import AuthEndpointPanel from './AuthEndpointPanel';
import AuthLoginView from './AuthLoginView';
import AuthProfileView from './AuthProfileView';

type AuthScreenProps = {
  code: string;
  countdownSeconds: number;
  endpointLabel: string;
  errorMessage?: string;
  host: string;
  isLoggingIn: boolean;
  isSendingCode: boolean;
  loginType: AuthLoginType;
  password: string;
  phone: string;
  port: string;
  profile?: AuthUserProfile;
  statusMessage?: string;
  tokenPreview?: string;
  onBack: () => void;
  onCodeChange: (value: string) => void;
  onHostChange: (value: string) => void;
  onLogin: () => void;
  onLoginTypeChange: (value: AuthLoginType) => void;
  onLogout: () => void;
  onPasswordChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onPortChange: (value: string) => void;
  onSendCode: () => void;
};

function AuthScreen({
  code,
  countdownSeconds,
  endpointLabel,
  errorMessage,
  host,
  isLoggingIn,
  isSendingCode,
  loginType,
  password,
  phone,
  port,
  profile,
  statusMessage,
  tokenPreview,
  onBack,
  onCodeChange,
  onHostChange,
  onLogin,
  onLoginTypeChange,
  onLogout,
  onPasswordChange,
  onPhoneChange,
  onPortChange,
  onSendCode,
}: AuthScreenProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="返回开发游乐场"
            onPress={onBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.backText}>返回</Text>
          </Pressable>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {profile ? '已登录' : '未登录'}
            </Text>
          </View>
        </View>

        <Text style={styles.kicker}>Auth Playground</Text>
        <Text style={styles.title}>用户认证</Text>
        <Text style={styles.subtitle}>
          验证码、JWT、个人资料请求的最小闭环。
        </Text>

        <AuthEndpointPanel
          endpointLabel={endpointLabel}
          host={host}
          port={port}
          onHostChange={onHostChange}
          onPortChange={onPortChange}
        />

        {profile ? (
          <AuthProfileView
            profile={profile}
            tokenPreview={tokenPreview}
            onLogout={onLogout}
          />
        ) : (
          <AuthLoginView
            code={code}
            countdownSeconds={countdownSeconds}
            errorMessage={errorMessage}
            isLoggingIn={isLoggingIn}
            isSendingCode={isSendingCode}
            loginType={loginType}
            password={password}
            phone={phone}
            statusMessage={statusMessage}
            onCodeChange={onCodeChange}
            onLogin={onLogin}
            onLoginTypeChange={onLoginTypeChange}
            onPasswordChange={onPasswordChange}
            onPhoneChange={onPhoneChange}
            onSendCode={onSendCode}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#f4f6fa',
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d9e2ee',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 14,
  },
  backText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 12,
  },
  badgeText: {
    color: '#f7d889',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
  kicker: {
    color: '#be8a19',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 28,
    textTransform: 'uppercase',
  },
  title: {
    color: '#111827',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 10,
  },
  subtitle: {
    color: '#667085',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 9,
  },
  pressed: {
    opacity: 0.72,
  },
});

export default AuthScreen;
