import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type AuthPasswordSetupViewProps = {
  confirmPassword: string;
  errorMessage?: string;
  isSaving: boolean;
  password: string;
  onConfirmPasswordChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
};

function AuthPasswordSetupView({
  confirmPassword,
  errorMessage,
  isSaving,
  password,
  onConfirmPasswordChange,
  onPasswordChange,
  onSubmit,
}: AuthPasswordSetupViewProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Password</Text>
        <Text style={styles.title}>设置登录密码</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>新密码</Text>
        <View style={styles.passwordField}>
          <TextInput
            accessibilityLabel="设置密码输入"
            autoCapitalize="none"
            onChangeText={onPasswordChange}
            placeholder="至少 6 位"
            placeholderTextColor="#a8b0bd"
            secureTextEntry={!isPasswordVisible}
            style={[styles.input, styles.passwordInput]}
            textContentType="newPassword"
            value={password}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isPasswordVisible ? '隐藏设置密码' : '显示设置密码'
            }
            onPress={() => setIsPasswordVisible(current => !current)}
            style={({ pressed }) => [
              styles.passwordEyeButton,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.eyeIcon,
                isPasswordVisible && styles.eyeIconActive,
              ]}
            >
              <View
                style={[
                  styles.eyePupil,
                  isPasswordVisible && styles.eyePupilActive,
                ]}
              />
              {!isPasswordVisible ? <View style={styles.eyeSlash} /> : null}
            </View>
          </Pressable>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>确认密码</Text>
        <TextInput
          accessibilityLabel="确认设置密码输入"
          autoCapitalize="none"
          onChangeText={onConfirmPasswordChange}
          placeholder="再次输入"
          placeholderTextColor="#a8b0bd"
          secureTextEntry={!isPasswordVisible}
          style={styles.input}
          textContentType="newPassword"
          value={confirmPassword}
        />
      </View>

      {errorMessage ? (
        <Text accessibilityLabel="设置密码错误提示" style={styles.errorText}>
          {errorMessage}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="保存登录密码"
        disabled={isSaving}
        onPress={onSubmit}
        style={({ pressed }) => [
          styles.primaryButton,
          (pressed || isSaving) && styles.pressed,
          isSaving && styles.disabledButton,
        ]}
      >
        <Text style={styles.primaryText}>
          {isSaving ? '保存中' : '保存密码'}
        </Text>
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
  disabledButton: {
    opacity: 0.52,
  },
  errorText: {
    color: '#b42318',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    marginTop: 13,
  },
  eyebrow: {
    color: '#be8a19',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  eyeIcon: {
    alignItems: 'center',
    borderColor: '#7a8597',
    borderRadius: 999,
    borderWidth: 2,
    height: 15,
    justifyContent: 'center',
    width: 24,
  },
  eyeIconActive: {
    borderColor: '#111827',
  },
  eyePupil: {
    backgroundColor: '#7a8597',
    borderRadius: 999,
    height: 5,
    width: 5,
  },
  eyePupilActive: {
    backgroundColor: '#111827',
  },
  eyeSlash: {
    backgroundColor: '#7a8597',
    borderRadius: 999,
    height: 2,
    position: 'absolute',
    transform: [{ rotate: '-35deg' }],
    width: 28,
  },
  field: {
    marginTop: 14,
  },
  header: {
    marginBottom: 4,
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
  label: {
    color: '#475467',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 7,
  },
  passwordEyeButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    width: 46,
  },
  passwordField: {
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 56,
  },
  pressed: {
    opacity: 0.72,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 48,
  },
  primaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  title: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 6,
  },
});

export default AuthPasswordSetupView;
