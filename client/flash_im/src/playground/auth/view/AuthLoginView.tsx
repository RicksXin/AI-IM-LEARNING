import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type AuthLoginViewProps = {
  code: string;
  countdownSeconds: number;
  errorMessage?: string;
  isLoggingIn: boolean;
  isSendingCode: boolean;
  phone: string;
  statusMessage?: string;
  onCodeChange: (value: string) => void;
  onLogin: () => void;
  onPhoneChange: (value: string) => void;
  onSendCode: () => void;
};

function AuthLoginView({
  code,
  countdownSeconds,
  errorMessage,
  isLoggingIn,
  isSendingCode,
  phone,
  statusMessage,
  onCodeChange,
  onLogin,
  onPhoneChange,
  onSendCode,
}: AuthLoginViewProps) {
  const sendCodeDisabled = isSendingCode || countdownSeconds > 0;
  const loginDisabled = isLoggingIn || isSendingCode;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardEyebrow}>Sign in</Text>
        <Text style={styles.cardTitle}>手机号验证码登录</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>手机号</Text>
        <TextInput
          accessibilityLabel="登录手机号输入"
          autoCapitalize="none"
          keyboardType="phone-pad"
          onChangeText={onPhoneChange}
          placeholder="13800000001"
          placeholderTextColor="#a8b0bd"
          style={styles.input}
          value={phone}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>验证码</Text>
        <View style={styles.codeRow}>
          <TextInput
            accessibilityLabel="登录验证码输入"
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={onCodeChange}
            placeholder="6 位验证码"
            placeholderTextColor="#a8b0bd"
            style={[styles.input, styles.codeInput]}
            value={code}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="发送登录验证码"
            disabled={sendCodeDisabled}
            onPress={onSendCode}
            style={({ pressed }) => [
              styles.secondaryButton,
              (pressed || isSendingCode) && styles.pressed,
              sendCodeDisabled && styles.disabledButton,
            ]}
          >
            <Text style={styles.secondaryText}>
              {countdownSeconds > 0
                ? `重新发送 ${countdownSeconds}s`
                : isSendingCode
                  ? '发送中'
                  : '发送验证码'}
            </Text>
          </Pressable>
        </View>
      </View>

      {statusMessage ? (
        <Text accessibilityLabel="认证状态提示" style={styles.statusText}>
          {statusMessage}
        </Text>
      ) : null}
      {errorMessage ? (
        <Text accessibilityLabel="认证错误提示" style={styles.errorText}>
          {errorMessage}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="登录用户认证"
        disabled={loginDisabled}
        onPress={onLogin}
        style={({ pressed }) => [
          styles.primaryButton,
          (pressed || isLoggingIn) && styles.pressed,
          loginDisabled && styles.disabledButton,
        ]}
      >
        <Text style={styles.primaryText}>{isLoggingIn ? '登录中' : '登录'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    padding: 18,
    shadowColor: '#0f172a',
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
  },
  cardHeader: {
    marginBottom: 18,
  },
  cardEyebrow: {
    color: '#be8a19',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 6,
  },
  field: {
    marginTop: 14,
  },
  label: {
    color: '#475467',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 7,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderColor: '#d9e2ee',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  codeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  codeInput: {
    flex: 1,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#fff8e7',
    borderColor: '#f3d79b',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 116,
    paddingHorizontal: 12,
  },
  secondaryText: {
    color: '#986b10',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
  },
  statusText: {
    color: '#146c43',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 18,
    marginTop: 14,
  },
  errorText: {
    color: '#b42318',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 18,
    marginTop: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 50,
    paddingHorizontal: 16,
  },
  primaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  disabledButton: {
    opacity: 0.48,
  },
  pressed: {
    opacity: 0.72,
  },
});

export default AuthLoginView;
