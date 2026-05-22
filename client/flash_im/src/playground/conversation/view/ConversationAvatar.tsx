import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type ConversationAvatarProps = {
  title: string;
  index: number;
};

const palette = ['#8db7f5', '#97c277', '#dfb05f', '#c691e8', '#ef8f8f'];

function ConversationAvatar({ title, index }: ConversationAvatarProps) {
  const backgroundColor = palette[index % palette.length];
  const initial = title.slice(0, 1);

  return (
    <View style={[styles.avatar, { backgroundColor }]}>
      <Text style={styles.initial}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    borderRadius: 8,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  initial: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0,
  },
});

export default ConversationAvatar;
