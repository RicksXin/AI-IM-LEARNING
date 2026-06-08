import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type SecureChatTab = 'chat' | 'me';

type SecureChatBottomTabsProps = {
  activeTab: SecureChatTab;
  onTabChange: (tab: SecureChatTab) => void;
};

function SecureChatBottomTabs({
  activeTab,
  onTabChange,
}: SecureChatBottomTabsProps) {
  return (
    <View style={styles.tabs}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="切换到聊天室"
        onPress={() => onTabChange('chat')}
        style={styles.tab}
      >
        <Text
          style={[styles.tabIcon, activeTab === 'chat' && styles.activeText]}
        >
          ●
        </Text>
        <Text style={[styles.tabText, activeTab === 'chat' && styles.activeText]}>
          聊天室
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="切换到我的"
        onPress={() => onTabChange('me')}
        style={styles.tab}
      >
        <Text style={[styles.tabIcon, activeTab === 'me' && styles.activeText]}>
          ●
        </Text>
        <Text style={[styles.tabText, activeTab === 'me' && styles.activeText]}>
          我的
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    backgroundColor: '#f9f9f9',
    borderTopColor: '#d7d7d7',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 58,
    paddingBottom: 4,
    paddingTop: 5,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  tabIcon: {
    color: '#a0a0a0',
    fontSize: 16,
    lineHeight: 20,
  },
  tabText: {
    color: '#7a7a7a',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    marginTop: 1,
  },
  activeText: {
    color: '#07c160',
  },
});

export default SecureChatBottomTabs;
