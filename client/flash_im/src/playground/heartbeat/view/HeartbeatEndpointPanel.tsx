import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

type HeartbeatEndpointPanelProps = {
  endpointLabel: string;
  host: string;
  port: string;
  onHostChange: (value: string) => void;
  onPortChange: (value: string) => void;
};

function HeartbeatEndpointPanel({
  endpointLabel,
  host,
  port,
  onHostChange,
  onPortChange,
}: HeartbeatEndpointPanelProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.inputRow}>
        <View style={styles.hostField}>
          <Text style={styles.inputLabel}>Host / IP</Text>
          <TextInput
            accessibilityLabel="心跳后端地址输入"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={onHostChange}
            placeholder="127.0.0.1"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={host}
          />
        </View>
        <View style={styles.portField}>
          <Text style={styles.inputLabel}>Port</Text>
          <TextInput
            accessibilityLabel="心跳后端端口输入"
            keyboardType="number-pad"
            onChangeText={onPortChange}
            placeholder="8080"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={port}
          />
        </View>
      </View>
      <Text numberOfLines={1} style={styles.endpoint}>
        {endpointLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#f8fafc',
    borderColor: '#dbe3ef',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 18,
    padding: 14,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  hostField: {
    flex: 1,
  },
  portField: {
    width: 92,
  },
  inputLabel: {
    color: '#647085',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe3ef',
    borderRadius: 8,
    borderWidth: 1,
    color: '#172033',
    fontSize: 15,
    minHeight: 42,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  endpoint: {
    color: '#176b87',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    marginTop: 10,
  },
});

export default HeartbeatEndpointPanel;
