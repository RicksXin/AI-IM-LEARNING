import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type AuthUserProfile from '../../auth/model/AuthUserProfile';
import type { SecureChatConnectionStatus } from '../model/SecureChatConnectionStatus';
import type { SecureChatMessage } from '../model/SecureChatMessage';
import SecureChatBottomTabs, { SecureChatTab } from './SecureChatBottomTabs';
import SecureChatMeView from './SecureChatMeView';
import SecureChatRoomView from './SecureChatRoomView';

type SecureChatScreenProps = {
  activeTab: SecureChatTab;
  code: string;
  countdownSeconds: number;
  draft: string;
  endpointLabel: string;
  errorMessage?: string;
  host: string;
  isLoggingIn: boolean;
  isSendingCode: boolean;
  lastHeartbeatAt?: string;
  messages: SecureChatMessage[];
  phone: string;
  port: string;
  profile?: AuthUserProfile;
  status: SecureChatConnectionStatus;
  statusMessage?: string;
  tokenPreview?: string;
  onBack: () => void;
  onCodeChange: (value: string) => void;
  onDraftChange: (value: string) => void;
  onHostChange: (value: string) => void;
  onLogin: () => void;
  onLogout: () => void;
  onPhoneChange: (value: string) => void;
  onPortChange: (value: string) => void;
  onReconnect: () => void;
  onSendCode: () => void;
  onSendMessage: () => void;
  onTabChange: (tab: SecureChatTab) => void;
};

function SecureChatScreen({
  activeTab,
  code,
  countdownSeconds,
  draft,
  endpointLabel,
  errorMessage,
  host,
  isLoggingIn,
  isSendingCode,
  lastHeartbeatAt,
  messages,
  phone,
  port,
  profile,
  status,
  statusMessage,
  tokenPreview,
  onBack,
  onCodeChange,
  onDraftChange,
  onHostChange,
  onLogin,
  onLogout,
  onPhoneChange,
  onPortChange,
  onReconnect,
  onSendCode,
  onSendMessage,
  onTabChange,
}: SecureChatScreenProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
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
        <Text style={styles.topTitle}>认证 IM</Text>
        <View style={styles.topRight} />
      </View>

      <View style={styles.body}>
        {activeTab === 'chat' ? (
          <SecureChatRoomView
            draft={draft}
            endpointLabel={endpointLabel}
            messages={messages}
            status={status}
            onDraftChange={onDraftChange}
            onReconnect={onReconnect}
            onSendMessage={onSendMessage}
          />
        ) : (
          <SecureChatMeView
            code={code}
            countdownSeconds={countdownSeconds}
            endpointLabel={endpointLabel}
            errorMessage={errorMessage}
            host={host}
            isLoggingIn={isLoggingIn}
            isSendingCode={isSendingCode}
            lastHeartbeatAt={lastHeartbeatAt}
            phone={phone}
            port={port}
            profile={profile}
            status={status}
            statusMessage={statusMessage}
            tokenPreview={tokenPreview}
            onCodeChange={onCodeChange}
            onHostChange={onHostChange}
            onLogin={onLogin}
            onLogout={onLogout}
            onPhoneChange={onPhoneChange}
            onPortChange={onPortChange}
            onReconnect={onReconnect}
            onSendCode={onSendCode}
          />
        )}
      </View>

      <SecureChatBottomTabs activeTab={activeTab} onTabChange={onTabChange} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#ededed',
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    backgroundColor: '#ededed',
    borderBottomColor: '#d3d3d3',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
    minWidth: 48,
  },
  backText: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
  topTitle: {
    color: '#111111',
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
  },
  topRight: {
    width: 48,
  },
  body: {
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
});

export default SecureChatScreen;
