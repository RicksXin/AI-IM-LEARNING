import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

type ConversationConnectionPanelProps = {
  endpointLabel: string;
  errorMessage?: string;
  host: string;
  port: string;
  onHostChange: (value: string) => void;
  onPortChange: (value: string) => void;
};

function ConversationConnectionPanel({
  endpointLabel,
  errorMessage,
  host,
  port,
  onHostChange,
  onPortChange,
}: ConversationConnectionPanelProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.inputRow}>
        <View style={styles.hostField}>
          <Text style={styles.label}>Host / IP</Text>
          <TextInput
            accessibilityLabel="后端地址输入"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={onHostChange}
            placeholder="127.0.0.1"
            placeholderTextColor="#a1a1aa"
            style={styles.input}
            value={host}
          />
        </View>
        <View style={styles.portField}>
          <Text style={styles.label}>Port</Text>
          <TextInput
            accessibilityLabel="后端端口输入"
            keyboardType="number-pad"
            onChangeText={onPortChange}
            placeholder="8080"
            placeholderTextColor="#a1a1aa"
            style={styles.input}
            value={port}
          />
        </View>
      </View>
      <Text numberOfLines={1} style={styles.endpoint}>
        {endpointLabel}
      </Text>
      {errorMessage ? (
        <Text numberOfLines={2} style={styles.error}>
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#f3f4f6',
    borderBottomColor: '#e5e5e5',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    color: '#71717a',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0,
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#dedede',
    borderRadius: 7,
    borderWidth: 1,
    color: '#111111',
    fontSize: 14,
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  endpoint: {
    color: '#737373',
    fontSize: 12,
    letterSpacing: 0,
    marginTop: 7,
  },
  error: {
    color: '#dc2626',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 5,
  },
});

export default ConversationConnectionPanel;
