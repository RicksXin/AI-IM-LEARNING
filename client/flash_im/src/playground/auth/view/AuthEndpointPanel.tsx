import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

type AuthEndpointPanelProps = {
  endpointLabel: string;
  host: string;
  port: string;
  onHostChange: (value: string) => void;
  onPortChange: (value: string) => void;
};

function AuthEndpointPanel({
  endpointLabel,
  host,
  port,
  onHostChange,
  onPortChange,
}: AuthEndpointPanelProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>后端地址</Text>
      <View style={styles.inputRow}>
        <View style={styles.hostField}>
          <Text style={styles.label}>Host / IP</Text>
          <TextInput
            accessibilityLabel="认证后端地址输入"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={onHostChange}
            placeholder="127.0.0.1"
            placeholderTextColor="#a8b0bd"
            style={styles.input}
            value={host}
          />
        </View>
        <View style={styles.portField}>
          <Text style={styles.label}>Port</Text>
          <TextInput
            accessibilityLabel="认证后端端口输入"
            keyboardType="number-pad"
            onChangeText={onPortChange}
            placeholder="8080"
            placeholderTextColor="#a8b0bd"
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
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 22,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
  },
  panelTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 12,
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
  label: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderColor: '#d9e2ee',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    fontSize: 15,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  endpoint: {
    color: '#64748b',
    fontSize: 12,
    letterSpacing: 0,
    marginTop: 10,
  },
});

export default AuthEndpointPanel;
