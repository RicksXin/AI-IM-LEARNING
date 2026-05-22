import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type ConversationHeaderProps = {
  isLoading: boolean;
  onBack: () => void;
  onRefresh: () => void;
};

function ConversationHeader({
  isLoading,
  onBack,
  onRefresh,
}: ConversationHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="返回开发游乐场"
        onPress={onBack}
        style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
      >
        <Text style={styles.actionText}>返回</Text>
      </Pressable>
      <Text style={styles.title}>微信</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="刷新会话列表"
        disabled={isLoading}
        onPress={onRefresh}
        style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
      >
        <Text style={[styles.actionText, isLoading && styles.disabledText]}>
          {isLoading ? '请求中' : '刷新'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderBottomColor: '#dfdfdf',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: 52,
    paddingHorizontal: 10,
  },
  title: {
    color: '#111111',
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0,
    textAlign: 'center',
  },
  headerAction: {
    alignItems: 'center',
    minHeight: 36,
    justifyContent: 'center',
    width: 62,
  },
  pressed: {
    opacity: 0.55,
  },
  actionText: {
    color: '#07c160',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0,
  },
  disabledText: {
    color: '#9b9b9b',
  },
});

export default ConversationHeader;
