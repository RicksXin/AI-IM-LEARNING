import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type Conversation from '../entities/Conversation';
import ConversationListItem from './ConversationListItem';

type ConversationListProps = {
  conversations: Conversation[];
};

function ConversationList({ conversations }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>暂无会话</Text>
        <Text style={styles.emptyMessage}>启动后端后刷新列表。</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {conversations.map((conversation, index) => (
        <ConversationListItem
          conversation={conversation}
          index={index}
          key={`${conversation.title}-${conversation.time}-${index}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: '#ffffff',
  },
  empty: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0,
  },
  emptyMessage: {
    color: '#9b9b9b',
    fontSize: 15,
    letterSpacing: 0,
    marginTop: 8,
  },
});

export default ConversationList;
