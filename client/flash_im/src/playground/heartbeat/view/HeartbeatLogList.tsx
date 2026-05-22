import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { HeartbeatLogEntry } from '../model/HeartbeatLogEntry';

type HeartbeatLogListProps = {
  logs: HeartbeatLogEntry[];
};

function HeartbeatLogList({ logs }: HeartbeatLogListProps) {
  if (logs.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>暂无日志，连接后会显示欢迎消息和 echo。</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {logs.map(log => (
        <View key={log.id} style={styles.row}>
          <Text style={styles.time}>{log.time}</Text>
          <Text style={[styles.type, styles[log.type]]}>
            {log.type.toUpperCase()}
          </Text>
          <Text style={styles.message}>{log.message}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
  },
  row: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  time: {
    color: '#94a3b8',
    fontSize: 12,
    letterSpacing: 0,
  },
  type: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 3,
  },
  connect: {
    color: '#38bdf8',
  },
  open: {
    color: '#4ade80',
  },
  send: {
    color: '#fde047',
  },
  receive: {
    color: '#a7f3d0',
  },
  close: {
    color: '#cbd5e1',
  },
  error: {
    color: '#fca5a5',
  },
  info: {
    color: '#d8b4fe',
  },
  message: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#dbe3ef',
    borderRadius: 8,
    borderWidth: 1,
    padding: 22,
  },
  emptyText: {
    color: '#647085',
    fontSize: 14,
    letterSpacing: 0,
    textAlign: 'center',
  },
});

export default HeartbeatLogList;
