import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HeartbeatConnectionStatus } from '../model/HeartbeatConnectionStatus';
import { isHeartbeatConnected } from '../model/HeartbeatConnectionStatus';
import type { HeartbeatLogEntry } from '../model/HeartbeatLogEntry';
import HeartbeatEndpointPanel from './HeartbeatEndpointPanel';
import HeartbeatLogList from './HeartbeatLogList';
import HeartbeatStatusBadge from './HeartbeatStatusBadge';

type HeartbeatScreenProps = {
  endpointLabel: string;
  heartbeatIntervalSeconds: number;
  host: string;
  lastHeartbeatAt?: string;
  logs: HeartbeatLogEntry[];
  port: string;
  status: HeartbeatConnectionStatus;
  onBack: () => void;
  onClearLogs: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onHostChange: (value: string) => void;
  onPortChange: (value: string) => void;
  onSendHeartbeat: () => void;
};

function HeartbeatScreen({
  endpointLabel,
  heartbeatIntervalSeconds,
  host,
  lastHeartbeatAt,
  logs,
  port,
  status,
  onBack,
  onClearLogs,
  onConnect,
  onDisconnect,
  onHostChange,
  onPortChange,
  onSendHeartbeat,
}: HeartbeatScreenProps) {
  const connected = isHeartbeatConnected(status);
  const connecting = status === 'connecting';

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
          <HeartbeatStatusBadge status={status} />
        </View>

        <Text style={styles.kicker}>WebSocket Playground</Text>
        <Text style={styles.title}>心跳通信</Text>
        <Text style={styles.subtitle}>
          连接后每 {heartbeatIntervalSeconds} 秒自动发送 ping，服务端会返回
          echo，可用来验证实时连接是否保持在线。
        </Text>

        <HeartbeatEndpointPanel
          endpointLabel={endpointLabel}
          host={host}
          port={port}
          onHostChange={onHostChange}
          onPortChange={onPortChange}
        />

        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>心跳间隔</Text>
            <Text style={styles.metricValue}>{heartbeatIntervalSeconds}s</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>最近心跳</Text>
            <Text style={styles.metricValue}>{lastHeartbeatAt ?? '-'}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="连接心跳通信"
            disabled={connected || connecting}
            onPress={onConnect}
            style={({ pressed }) => [
              styles.actionButton,
              styles.primaryButton,
              (pressed || connecting) && styles.pressed,
              (connected || connecting) && styles.disabledButton,
            ]}
          >
            <Text style={styles.primaryText}>
              {connecting ? '连接中' : '连接'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="发送心跳"
            disabled={!connected}
            onPress={onSendHeartbeat}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.pressed,
              !connected && styles.disabledButton,
            ]}
          >
            <Text style={styles.actionText}>发送心跳</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="断开心跳通信"
            disabled={!connected && !connecting}
            onPress={onDisconnect}
            style={({ pressed }) => [
              styles.actionButton,
              styles.dangerButton,
              pressed && styles.pressed,
              !connected && !connecting && styles.disabledButton,
            ]}
          >
            <Text style={styles.dangerText}>断开</Text>
          </Pressable>
        </View>

        <View style={styles.logHeader}>
          <Text style={styles.sectionTitle}>通信日志</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="清空心跳日志"
            onPress={onClearLogs}
            style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}
          >
            <Text style={styles.clearText}>清空</Text>
          </Pressable>
        </View>

        <HeartbeatLogList logs={logs} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#eef4fa',
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
    borderColor: '#dbe3ef',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 38,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
  backText: {
    color: '#176b87',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
  kicker: {
    color: '#176b87',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 28,
    textTransform: 'uppercase',
  },
  title: {
    color: '#172033',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 10,
  },
  subtitle: {
    color: '#647085',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
  },
  metrics: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  metric: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe3ef',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  metricLabel: {
    color: '#647085',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  metricValue: {
    color: '#172033',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 5,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dbe3ef',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    minWidth: 96,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryButton: {
    backgroundColor: '#176b87',
    borderColor: '#176b87',
  },
  dangerButton: {
    borderColor: 'rgba(185, 28, 28, 0.28)',
  },
  disabledButton: {
    opacity: 0.48,
  },
  primaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  actionText: {
    color: '#172033',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  dangerText: {
    color: '#b91c1c',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  logHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 28,
  },
  sectionTitle: {
    color: '#172033',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0,
  },
  clearButton: {
    alignItems: 'center',
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  clearText: {
    color: '#176b87',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0,
  },
});

export default HeartbeatScreen;
