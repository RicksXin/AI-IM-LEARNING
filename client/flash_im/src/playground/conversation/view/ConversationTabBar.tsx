import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const WECHAT_GREEN = '#07c160';

type TabItem = {
  key: string;
  label: string;
  active?: boolean;
  badge?: boolean;
};

const tabs: TabItem[] = [
  { key: 'wechat', label: '微信', active: true },
  { key: 'contacts', label: '通讯录' },
  { key: 'discover', label: '发现', badge: true },
  { key: 'me', label: '我' },
];

function ConversationTabBar() {
  return (
    <View style={styles.bar}>
      {tabs.map(tab => (
        <View key={tab.key} style={styles.item}>
          <TabIcon tabKey={tab.key} active={tab.active} />
          {tab.badge ? <View style={styles.badge} /> : null}
          <Text style={[styles.label, tab.active && styles.activeLabel]}>
            {tab.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function TabIcon({
  active,
  tabKey,
}: {
  active?: boolean;
  tabKey: string;
}) {
  const color = active ? WECHAT_GREEN : '#1f1f1f';

  if (tabKey === 'wechat') {
    return (
      <View style={styles.iconBox}>
        <View
          style={[
            styles.chatBubble,
            { backgroundColor: color, borderColor: color },
          ]}
        />
        <View style={[styles.chatTail, { backgroundColor: color }]} />
      </View>
    );
  }

  if (tabKey === 'discover') {
    return (
      <View style={[styles.compass, { borderColor: color }]}>
        <View style={[styles.compassNeedle, { borderBottomColor: color }]} />
      </View>
    );
  }

  return (
    <View style={styles.iconBox}>
      <View style={[styles.personHead, { borderColor: color }]} />
      <View style={[styles.personBody, { borderColor: color }]} />
      {tabKey === 'contacts' ? (
        <View style={[styles.contactLines, { backgroundColor: color }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: '#fbfbfb',
    borderTopColor: '#dedede',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 84,
    paddingBottom: 8,
    paddingTop: 8,
  },
  item: {
    alignItems: 'center',
    flex: 1,
    minHeight: 62,
  },
  label: {
    color: '#1f1f1f',
    fontSize: 13,
    letterSpacing: 0,
    marginTop: 5,
  },
  activeLabel: {
    color: WECHAT_GREEN,
  },
  iconBox: {
    alignItems: 'center',
    height: 31,
    justifyContent: 'center',
    width: 40,
  },
  chatBubble: {
    borderRadius: 18,
    borderWidth: 2,
    height: 24,
    width: 31,
  },
  chatTail: {
    borderBottomLeftRadius: 1,
    height: 8,
    marginTop: -6,
    transform: [{ rotate: '38deg' }],
    width: 10,
  },
  personHead: {
    borderRadius: 14,
    borderWidth: 2,
    height: 17,
    width: 17,
  },
  personBody: {
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderTopWidth: 0,
    height: 15,
    marginTop: -1,
    width: 29,
  },
  contactLines: {
    height: 2,
    position: 'absolute',
    right: 2,
    top: 16,
    width: 8,
  },
  compass: {
    alignItems: 'center',
    borderRadius: 17,
    borderWidth: 3,
    height: 31,
    justifyContent: 'center',
    width: 31,
  },
  compassNeedle: {
    borderBottomWidth: 13,
    borderLeftColor: 'transparent',
    borderLeftWidth: 5,
    borderRightColor: 'transparent',
    borderRightWidth: 5,
    height: 0,
    transform: [{ rotate: '45deg' }],
    width: 0,
  },
  badge: {
    backgroundColor: '#ff3b30',
    borderRadius: 5,
    height: 10,
    position: 'absolute',
    right: 31,
    top: 0,
    width: 10,
  },
});

export default ConversationTabBar;
