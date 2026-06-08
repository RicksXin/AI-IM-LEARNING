import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SecureChatConnectionStatus } from '../model/SecureChatConnectionStatus';
import { getSecureChatConnectionStatusLabel } from '../model/SecureChatConnectionStatus';

type SecureChatStatusPillProps = {
  status: SecureChatConnectionStatus;
};

function SecureChatStatusPill({ status }: SecureChatStatusPillProps) {
  const connected = status === 'connected';
  const active = status === 'connecting' || status === 'authenticating';
  const error = status === 'error';

  return (
    <View
      style={[
        styles.pill,
        connected && styles.connected,
        active && styles.active,
        error && styles.error,
      ]}
    >
      <Text
        style={[
          styles.text,
          connected && styles.connectedText,
          active && styles.activeText,
          error && styles.errorText,
        ]}
      >
        {getSecureChatConnectionStatusLabel(status)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  connected: {
    backgroundColor: '#e8f7ee',
  },
  active: {
    backgroundColor: '#fff7df',
  },
  error: {
    backgroundColor: '#fff0f0',
  },
  text: {
    color: '#707070',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  connectedText: {
    color: '#07a652',
  },
  activeText: {
    color: '#946200',
  },
  errorText: {
    color: '#c62828',
  },
});

export default SecureChatStatusPill;
