import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.kicker}>Flash IM</Text>
        <Text style={styles.title}>环境已就绪</Text>
        <Text style={styles.subtitle}>
          第一个全端应用已经跑起来。生产入口保持干净，适合继续接入真实业务。
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050510',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  kicker: {
    color: '#6ee7ff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  title: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    color: '#b8bdd7',
    fontSize: 17,
    lineHeight: 26,
    marginTop: 14,
    maxWidth: 340,
  },
});

export default HomeScreen;
