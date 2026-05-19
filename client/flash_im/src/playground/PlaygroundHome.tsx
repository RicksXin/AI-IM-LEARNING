import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PlaygroundHomeProps = {
  onOpenFireworks: () => void;
};

function PlaygroundHome({ onOpenFireworks }: PlaygroundHomeProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>Flash IM Playground</Text>
        <Text style={styles.title}>开发游乐场</Text>
        <Text style={styles.subtitle}>
          用来演练、测试和学习的独立前端入口，不进入正式产品入口。
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>案例</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="打开烟花秀案例"
            onPress={onOpenFireworks}
            style={({ pressed }) => [
              styles.caseCard,
              pressed && styles.caseCardPressed,
            ]}
          >
            <View style={styles.caseAccent} />
            <View style={styles.caseCopy}>
              <Text style={styles.caseTitle}>烟花秀</Text>
              <Text style={styles.caseDescription}>
                点击屏幕释放烟花，验证动画、手势和沉浸式场景。
              </Text>
            </View>
            <Text style={styles.caseArrow}>›</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0b1020',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  kicker: {
    color: '#7dd3fc',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#ffffff',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 12,
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    maxWidth: 360,
  },
  section: {
    marginTop: 36,
  },
  sectionTitle: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 14,
  },
  caseCard: {
    alignItems: 'center',
    backgroundColor: '#121a2f',
    borderColor: '#26324f',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 88,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  caseCardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  caseAccent: {
    backgroundColor: '#ff4fd8',
    borderRadius: 8,
    height: 44,
    marginRight: 14,
    width: 6,
  },
  caseCopy: {
    flex: 1,
  },
  caseTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0,
  },
  caseDescription: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  caseArrow: {
    color: '#e2e8f0',
    fontSize: 34,
    fontWeight: '300',
    lineHeight: 38,
    marginLeft: 12,
  },
});

export default PlaygroundHome;
