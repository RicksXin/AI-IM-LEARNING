import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type SecureChatLoginPanelProps = {
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

function SecureChatLoginPanel({
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
}: SecureChatLoginPanelProps) {
  const sendCodeDisabled = isSendingCode || countdownSeconds > 0;
  const loginDisabled = isLoggingIn || isSendingCode;

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>手机号登录</Text>
      <View style={styles.field}>
        <Text style={styles.label}>手机号</Text>
        <TextInput
          accessibilityLabel="认证聊天室手机号输入"
          keyboardType="phone-pad"
          onChangeText={onPhoneChange}
          placeholder="13800000001"
          placeholderTextColor="#b1b1b1"
          style={styles.input}
          value={phone}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>验证码</Text>
        <View style={styles.codeRow}>
          <TextInput
            accessibilityLabel="认证聊天室验证码输入"
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={onCodeChange}
            placeholder="6 位验证码"
            placeholderTextColor="#b1b1b1"
            style={[styles.input, styles.codeInput]}
            value={code}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="发送认证聊天室验证码"
            disabled={sendCodeDisabled}
            onPress={onSendCode}
            style={({ pressed }) => [
              styles.codeButton,
              (pressed || isSendingCode) && styles.pressed,
              sendCodeDisabled && styles.disabled,
            ]}
          >
            <Text style={styles.codeButtonText}>
              {countdownSeconds > 0
                ? `${countdownSeconds}s`
                : isSendingCode
                  ? '发送中'
                  : '验证码'}
            </Text>
          </Pressable>
        </View>
      </View>
      {statusMessage ? (
        <Text accessibilityLabel="认证聊天室状态提示" style={styles.status}>
          {statusMessage}
        </Text>
      ) : null}
      {errorMessage ? (
        <Text accessibilityLabel="认证聊天室错误提示" style={styles.error}>
          {errorMessage}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="登录并进入认证聊天室"
        disabled={loginDisabled}
        onPress={onLogin}
        style={({ pressed }) => [
          styles.loginButton,
          (pressed || isLoggingIn) && styles.pressed,
          loginDisabled && styles.disabled,
        ]}
      >
        <Text style={styles.loginText}>
          {isLoggingIn ? '登录中' : '登录并连接'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginHorizontal: 14,
    marginTop: 14,
    padding: 16,
  },
  title: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 8,
  },
  field: {
    marginTop: 12,
  },
  label: {
    color: '#6b6b6b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    color: '#111111',
    fontSize: 16,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  codeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  codeInput: {
    flex: 1,
  },
  codeButton: {
    alignItems: 'center',
    backgroundColor: '#e8f7ee',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 46,
    minWidth: 86,
    paddingHorizontal: 10,
  },
  codeButtonText: {
    color: '#07a652',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
  },
  status: {
    color: '#188653',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 18,
    marginTop: 12,
  },
  error: {
    color: '#c62828',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 18,
    marginTop: 12,
  },
  loginButton: {
    alignItems: 'center',
    backgroundColor: '#07c160',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 48,
  },
  loginText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  disabled: {
    opacity: 0.48,
  },
  pressed: {
    opacity: 0.72,
  },
});

export default SecureChatLoginPanel;
