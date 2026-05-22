import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type Conversation from '../entities/Conversation';
import ConversationConnectionPanel from './ConversationConnectionPanel';
import ConversationHeader from './ConversationHeader';
import ConversationList from './ConversationList';
import ConversationTabBar from './ConversationTabBar';

type ConversationScreenProps = {
  conversations: Conversation[];
  endpointLabel: string;
  errorMessage?: string;
  host: string;
  isLoading: boolean;
  port: string;
  onBack: () => void;
  onHostChange: (value: string) => void;
  onPortChange: (value: string) => void;
  onRefresh: () => void;
};

function ConversationScreen({
  conversations,
  endpointLabel,
  errorMessage,
  host,
  isLoading,
  port,
  onBack,
  onHostChange,
  onPortChange,
  onRefresh,
}: ConversationScreenProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <ConversationHeader
        isLoading={isLoading}
        onBack={onBack}
        onRefresh={onRefresh}
      />
      <ConversationConnectionPanel
        endpointLabel={endpointLabel}
        errorMessage={errorMessage}
        host={host}
        port={port}
        onHostChange={onHostChange}
        onPortChange={onPortChange}
      />
      <View style={styles.body}>
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <ConversationList conversations={conversations} />
        </ScrollView>
      </View>
      <ConversationTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  body: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
});

export default ConversationScreen;
