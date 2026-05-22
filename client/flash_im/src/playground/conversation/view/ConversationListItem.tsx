import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type Conversation from '../entities/Conversation';
import ConversationAvatar from './ConversationAvatar';

type ConversationListItemProps = {
  conversation: Conversation;
  index: number;
};

function ConversationListItem({
  conversation,
  index,
}: ConversationListItemProps) {
  return (
    <View style={styles.row}>
      <ConversationAvatar title={conversation.title} index={index} />
      <View style={styles.content}>
        <View style={styles.topLine}>
          <Text numberOfLines={1} style={styles.title}>
            {conversation.title}
          </Text>
          <Text style={styles.time}>{conversation.time}</Text>
        </View>
        <Text numberOfLines={1} style={styles.lastMsg}>
          {conversation.lastMsg}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    minHeight: 88,
    paddingLeft: 16,
  },
  content: {
    alignSelf: 'stretch',
    borderBottomColor: '#ececec',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flex: 1,
    justifyContent: 'center',
    marginLeft: 14,
    paddingRight: 18,
  },
  topLine: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  title: {
    color: '#111111',
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0,
  },
  time: {
    color: '#b7b7b7',
    fontSize: 15,
    letterSpacing: 0,
    marginLeft: 12,
  },
  lastMsg: {
    color: '#b3b3b3',
    fontSize: 17,
    letterSpacing: 0,
    lineHeight: 23,
    marginTop: 8,
  },
});

export default ConversationListItem;
