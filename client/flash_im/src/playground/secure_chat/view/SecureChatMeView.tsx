import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type AuthUserProfile from '../../auth/model/AuthUserProfile';
import type { SecureChatConnectionStatus } from '../model/SecureChatConnectionStatus';
import SecureChatLoginPanel from './SecureChatLoginPanel';
import SecureChatStatusPill from './SecureChatStatusPill';

type SecureChatMeViewProps = {
  code: string;
  countdownSeconds: number;
  endpointLabel: string;
  errorMessage?: string;
  host: string;
  isLoggingIn: boolean;
  isSendingCode: boolean;
  lastHeartbeatAt?: string;
  phone: string;
  port: string;
  profile?: AuthUserProfile;
  status: SecureChatConnectionStatus;
  statusMessage?: string;
  tokenPreview?: string;
  onCodeChange: (value: string) => void;
  onHostChange: (value: string) => void;
  onLogin: () => void;
  onLogout: () => void;
  onPhoneChange: (value: string) => void;
  onPortChange: (value: string) => void;
  onReconnect: () => void;
  onSendCode: () => void;
};

function SecureChatMeView({
  code,
  countdownSeconds,
  endpointLabel,
  errorMessage,
  host,
  isLoggingIn,
  isSendingCode,
  lastHeartbeatAt,
  phone,
  port,
  profile,
  status,
  statusMessage,
  tokenPreview,
  onCodeChange,
  onHostChange,
  onLogin,
  onLogout,
  onPhoneChange,
  onPortChange,
  onReconnect,
  onSendCode,
}: SecureChatMeViewProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>我的</Text>
        <SecureChatStatusPill status={status} />
      </View>

      <View style={styles.endpointPanel}>
        <Text style={styles.panelTitle}>连接地址</Text>
        <View style={styles.inputRow}>
          <View style={styles.hostField}>
            <Text style={styles.label}>Host / IP</Text>
            <TextInput
              accessibilityLabel="认证聊天室后端地址输入"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={onHostChange}
              placeholder="127.0.0.1"
              placeholderTextColor="#b1b1b1"
              style={styles.input}
              value={host}
            />
          </View>
          <View style={styles.portField}>
            <Text style={styles.label}>Port</Text>
            <TextInput
              accessibilityLabel="认证聊天室后端端口输入"
              keyboardType="number-pad"
              onChangeText={onPortChange}
              placeholder="8080"
              placeholderTextColor="#b1b1b1"
              style={styles.input}
              value={port}
            />
          </View>
        </View>
        <Text numberOfLines={1} style={styles.endpoint}>
          {endpointLabel}
        </Text>
      </View>

      {profile ? (
        <View style={styles.profilePanel}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile.avatarInitial}</Text>
            </View>
            <View style={styles.profileCopy}>
              <Text style={styles.nickname}>{profile.nickname}</Text>
              <Text style={styles.phone}>{profile.phone}</Text>
            </View>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>User ID</Text>
            <Text numberOfLines={1} style={styles.metaValue}>
              {profile.userId}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Token</Text>
            <Text numberOfLines={1} style={styles.metaValue}>
              {tokenPreview ?? '已保存'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>最近心跳</Text>
            <Text numberOfLines={1} style={styles.metaValue}>
              {lastHeartbeatAt ?? '-'}
            </Text>
          </View>
          {statusMessage ? (
            <Text style={styles.statusMessage}>{statusMessage}</Text>
          ) : null}
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          <View style={styles.profileActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="重新连接认证聊天室"
              onPress={onReconnect}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryText}>重新连接</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="退出认证聊天室"
              onPress={onLogout}
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.logoutText}>退出登录</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <SecureChatLoginPanel
          code={code}
          countdownSeconds={countdownSeconds}
          errorMessage={errorMessage}
          isLoggingIn={isLoggingIn}
          isSendingCode={isSendingCode}
          phone={phone}
          statusMessage={statusMessage}
          onCodeChange={onCodeChange}
          onLogin={onLogin}
          onPhoneChange={onPhoneChange}
          onSendCode={onSendCode}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingBottom: 18,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#ededed',
    borderBottomColor: '#d3d3d3',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 54,
    paddingHorizontal: 14,
  },
  title: {
    color: '#111111',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0,
  },
  endpointPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginHorizontal: 14,
    marginTop: 14,
    padding: 14,
  },
  panelTitle: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  hostField: {
    flex: 1,
  },
  portField: {
    width: 88,
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
    fontSize: 15,
    minHeight: 42,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  endpoint: {
    color: '#7a7a7a',
    fontSize: 12,
    letterSpacing: 0,
    marginTop: 9,
  },
  profilePanel: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginHorizontal: 14,
    marginTop: 14,
    padding: 16,
  },
  profileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 14,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#07c160',
    borderRadius: 8,
    height: 58,
    justifyContent: 'center',
    marginRight: 13,
    width: 58,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
  },
  profileCopy: {
    flex: 1,
  },
  nickname: {
    color: '#111111',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0,
  },
  phone: {
    color: '#7a7a7a',
    fontSize: 15,
    letterSpacing: 0,
    marginTop: 4,
  },
  metaItem: {
    borderTopColor: '#eeeeee',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 11,
  },
  metaLabel: {
    color: '#7a7a7a',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 4,
  },
  metaValue: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
  statusMessage: {
    color: '#188653',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 18,
  },
  error: {
    color: '#c62828',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 18,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#e8f7ee',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  secondaryText: {
    color: '#07a652',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#fff0f0',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  logoutText: {
    color: '#c62828',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  pressed: {
    opacity: 0.72,
  },
});

export default SecureChatMeView;
