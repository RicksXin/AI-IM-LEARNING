import React from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type HomeScreenProps = {
  onOpenFireworks: () => void;
};

function HomeScreen({ onOpenFireworks }: HomeScreenProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.kicker}>Flash IM</Text>
        <Text style={styles.title}>环境已就绪</Text>
        <Text style={styles.subtitle}>
          第一个全端应用已经跑起来。现在按下按钮，把这一刻炸成彩色。
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="打开烟花秀"
          onPress={onOpenFireworks}
          style={({ pressed }) => [
            styles.fireworksButton,
            pressed && styles.fireworksButtonPressed,
          ]}
        >
          <Text style={styles.buttonText}>烟花秀</Text>
        </Pressable>
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
  fireworksButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ff4fd8',
    borderRadius: 8,
    marginTop: 34,
    paddingHorizontal: 26,
    paddingVertical: 15,
    shadowColor: '#ff4fd8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  fireworksButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0,
  },
});

export default HomeScreen;
