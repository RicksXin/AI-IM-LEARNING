import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FireworksLayer from '../features/fireworks/FireworksLayer';
import { createFireworkBurst } from '../features/fireworks/createFireworkBurst';
import type { FireworkBurst } from '../features/fireworks/types';

type FireworksShowScreenProps = {
  onBack: () => void;
};

type Star = {
  id: string;
  left: number;
  top: number;
  size: number;
  opacity: number;
};

const MAX_BURSTS = 9;

function FireworksShowScreen({ onBack }: FireworksShowScreenProps) {
  const [bursts, setBursts] = useState<FireworkBurst[]>([]);
  const idRef = useRef(0);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const stars = useMemo(() => createStars(width, height), [width, height]);

  const spawnBurst = useCallback(
    (x: number, y: number, power = 1) => {
      const nextBurst = createFireworkBurst({
        id: `burst-${idRef.current}`,
        x,
        y,
        width,
        height,
        power,
      });
      idRef.current += 1;

      setBursts(current => [...current.slice(-MAX_BURSTS + 1), nextBurst]);
    },
    [height, width],
  );

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      const { locationX, locationY } = event.nativeEvent;
      spawnBurst(locationX, locationY, 1.15);
    },
    [spawnBurst],
  );

  const handleBurstDone = useCallback((id: string) => {
    setBursts(current => current.filter(burst => burst.id !== id));
  }, []);

  useEffect(() => {
    const introTimers = [
      setTimeout(() => spawnBurst(width * 0.5, height * 0.35, 1.35), 220),
      setTimeout(() => spawnBurst(width * 0.28, height * 0.48, 1.1), 620),
      setTimeout(() => spawnBurst(width * 0.72, height * 0.46, 1.1), 920),
    ];

    const ambientTimer = setInterval(() => {
      const x = width * (0.18 + Math.random() * 0.64);
      const y = height * (0.2 + Math.random() * 0.46);
      spawnBurst(x, y, 0.82);
    }, 2600);

    return () => {
      introTimers.forEach(clearTimeout);
      clearInterval(ambientTimer);
    };
  }, [height, spawnBurst, width]);

  return (
    <View style={styles.screen}>
      <Pressable style={StyleSheet.absoluteFill} onPress={handlePress}>
        <View style={styles.sky}>
          {stars.map(star => (
            <View
              key={star.id}
              style={[
                styles.star,
                {
                  left: star.left,
                  opacity: star.opacity,
                  top: star.top,
                  width: star.size,
                  height: star.size,
                },
              ]}
            />
          ))}
        </View>
      </Pressable>

      <FireworksLayer bursts={bursts} onBurstDone={handleBurstDone} />

      <View
        pointerEvents="box-none"
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回首页"
          onPress={onBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
        >
          <Text style={styles.backText}>返回</Text>
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>点击屏幕释放烟花</Text>
          <Text style={styles.subtitle}>越兴奋，点得越密。</Text>
        </View>
      </View>
    </View>
  );
}

function createStars(width: number, height: number): Star[] {
  return Array.from({ length: 84 }, (_, index) => ({
    id: `star-${index}`,
    left: Math.random() * width,
    top: Math.random() * height,
    size: 1 + Math.random() * 2.8,
    opacity: 0.22 + Math.random() * 0.7,
  }));
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050510',
  },
  sky: {
    flex: 1,
    backgroundColor: '#050510',
  },
  star: {
    position: 'absolute',
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  header: {
    left: 0,
    paddingHorizontal: 18,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  backButtonPressed: {
    opacity: 0.75,
  },
  backText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0,
  },
  titleBlock: {
    marginTop: 18,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    color: '#b9c2ff',
    fontSize: 14,
    marginTop: 6,
  },
});

export default FireworksShowScreen;
