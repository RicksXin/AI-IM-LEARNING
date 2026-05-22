import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  getHeartbeatConnectionStatusLabel,
  HeartbeatConnectionStatus,
} from '../model/HeartbeatConnectionStatus';

type HeartbeatStatusBadgeProps = {
  status: HeartbeatConnectionStatus;
};

function HeartbeatStatusBadge({ status }: HeartbeatStatusBadgeProps) {
  return (
    <View style={styles.badge}>
      <View style={[styles.dot, styles[status]]} />
      <Text style={styles.label}>
        {getHeartbeatConnectionStatusLabel(status)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderColor: '#dbe3ef',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 34,
    paddingHorizontal: 12,
  },
  dot: {
    borderRadius: 5,
    height: 10,
    marginRight: 8,
    width: 10,
  },
  disconnected: {
    backgroundColor: '#94a3b8',
  },
  connecting: {
    backgroundColor: '#f59e0b',
  },
  connected: {
    backgroundColor: '#16a34a',
  },
  error: {
    backgroundColor: '#dc2626',
  },
  label: {
    color: '#172033',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0,
  },
});

export default HeartbeatStatusBadge;
