import React, { useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { SecureChatConnectionStatus } from '../model/SecureChatConnectionStatus';
import { isSecureChatConnected } from '../model/SecureChatConnectionStatus';
import type { SecureChatMessage } from '../model/SecureChatMessage';
import SecureChatStatusPill from './SecureChatStatusPill';

type SecureChatRoomViewProps = {
  draft: string;
  endpointLabel: string;
  messages: SecureChatMessage[];
  status: SecureChatConnectionStatus;
  onDraftChange: (value: string) => void;
  onReconnect: () => void;
  onSendMessage: () => void;
};

function SecureChatRoomView({
  draft,
  endpointLabel,
  messages,
  status,
  onDraftChange,
  onReconnect,
  onSendMessage,
}: SecureChatRoomViewProps) {
  const connected = isSecureChatConnected(status);
  const messageListRef = useRef<ScrollView | null>(null);

  const scrollToLatestMessage = () => {
    messageListRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <View style={styles.container}>
      <View style={styles.roomHeader}>
        <View style={styles.roomTitleBox}>
          <Text style={styles.roomTitle}>认证聊天室</Text>
          <Text numberOfLines={1} style={styles.endpoint}>
            {endpointLabel}
          </Text>
        </View>
        <SecureChatStatusPill status={status} />
      </View>

      <ScrollView
        contentContainerStyle={styles.messages}
        onContentSizeChange={scrollToLatestMessage}
        onLayout={scrollToLatestMessage}
        ref={messageListRef}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(message => (
          <View
            key={message.id}
            style={[
              styles.messageRow,
              message.kind === 'outgoing' && styles.outgoingRow,
              message.kind === 'system' && styles.systemRow,
            ]}
          >
            {message.kind === 'system' ? (
              <Text style={styles.systemText}>{message.content}</Text>
            ) : (
              <View
                style={[
                  styles.bubble,
                  message.kind === 'outgoing' && styles.outgoingBubble,
                ]}
              >
                {message.senderName ? (
                  <Text
                    style={[
                      styles.senderName,
                      message.kind === 'outgoing' && styles.outgoingSender,
                    ]}
                  >
                    {message.senderName}
                  </Text>
                ) : null}
                <Text style={styles.bubbleText}>{message.content}</Text>
                <Text style={styles.messageTime}>{message.time}</Text>
                {message.deliveryStatus ? (
                  <Text
                    style={[
                      styles.deliveryStatus,
                      message.deliveryStatus === 'failed' &&
                        styles.failedStatus,
                    ]}
                  >
                    {getDeliveryStatusLabel(message.deliveryStatus)}
                  </Text>
                ) : null}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          accessibilityLabel="认证聊天室消息输入"
          editable={connected}
          onChangeText={onDraftChange}
          placeholder={connected ? '发消息' : '登录后自动连接聊天室'}
          placeholderTextColor="#9a9a9a"
          style={styles.messageInput}
          value={draft}
        />
        {connected ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="发送认证聊天室消息"
            onPress={onSendMessage}
            style={({ pressed }) => [
              styles.sendButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.sendText}>发送</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="重新连接认证聊天室"
            onPress={onReconnect}
            style={({ pressed }) => [
              styles.reconnectButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.reconnectText}>连接</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function getDeliveryStatusLabel(
  status: NonNullable<SecureChatMessage['deliveryStatus']>,
) {
  switch (status) {
    case 'delivered':
      return '已送达';
    case 'failed':
      return '发送失败';
    case 'sending':
    default:
      return '发送中';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  roomHeader: {
    alignItems: 'center',
    backgroundColor: '#ededed',
    borderBottomColor: '#d3d3d3',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 54,
    paddingHorizontal: 14,
  },
  roomTitleBox: {
    flex: 1,
    marginRight: 10,
  },
  roomTitle: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
  },
  endpoint: {
    color: '#7a7a7a',
    fontSize: 11,
    letterSpacing: 0,
    marginTop: 2,
  },
  messages: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  messageRow: {
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  outgoingRow: {
    alignItems: 'flex-end',
  },
  systemRow: {
    alignItems: 'center',
  },
  systemText: {
    backgroundColor: '#d7d7d7',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  bubble: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  outgoingBubble: {
    backgroundColor: '#95ec69',
  },
  senderName: {
    color: '#7a7a7a',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0,
    marginBottom: 3,
  },
  outgoingSender: {
    color: '#3e7a23',
  },
  bubbleText: {
    color: '#111111',
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 22,
  },
  messageTime: {
    color: '#707070',
    fontSize: 10,
    letterSpacing: 0,
    marginTop: 5,
    textAlign: 'right',
  },
  deliveryStatus: {
    color: '#4f8f2f',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0,
    marginTop: 2,
    textAlign: 'right',
  },
  failedStatus: {
    color: '#c62828',
  },
  inputBar: {
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderTopColor: '#d7d7d7',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    minHeight: 58,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  messageInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    color: '#111111',
    flex: 1,
    fontSize: 16,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#07c160',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 58,
  },
  sendText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  reconnectButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 58,
  },
  reconnectText: {
    color: '#07a652',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  pressed: {
    opacity: 0.72,
  },
});

export default SecureChatRoomView;
