import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import type { FireworkBurst, FireworkParticle } from './types';

type FireworkBurstViewProps = {
  burst: FireworkBurst;
  onDone: (id: string) => void;
};

function FireworkBurstView({ burst, onDone }: FireworkBurstViewProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: burst.duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished) {
        onDone(burst.id);
      }
    });

    return () => animation.stop();
  }, [burst.duration, burst.id, onDone, progress]);

  const flashOpacity = progress.interpolate({
    inputRange: [0, 0.08, 0.22, 1],
    outputRange: [0, 1, 0.25, 0],
  });
  const ringScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 3.6],
  });
  const ringOpacity = progress.interpolate({
    inputRange: [0, 0.34, 1],
    outputRange: [0.9, 0.22, 0],
  });

  return (
    <View
      pointerEvents="none"
      style={[styles.burstRoot, { left: burst.x, top: burst.y }]}
    >
      <Animated.View
        style={[
          styles.flash,
          {
            backgroundColor: burst.color,
            opacity: flashOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: burst.color,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      {burst.particles.map(particle => (
        <ParticleView
          key={particle.id}
          particle={particle}
          progress={progress}
        />
      ))}
    </View>
  );
}

type ParticleViewProps = {
  particle: FireworkParticle;
  progress: Animated.Value;
};

function ParticleView({ particle, progress }: ParticleViewProps) {
  const translateX = progress.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [
      0,
      Math.cos(particle.angle) * particle.distance,
      Math.cos(particle.angle) * particle.distance * 1.06,
    ],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [
      0,
      Math.sin(particle.angle) * particle.distance,
      Math.sin(particle.angle) * particle.distance + 74,
    ],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 0.72, 1],
    outputRange: [0, 1, 0.95, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0.2, 1, 0.45],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${particle.spin}deg`],
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          backgroundColor: particle.color,
          height: particle.size,
          opacity,
          shadowColor: particle.color,
          transform: [{ translateX }, { translateY }, { rotate }, { scale }],
          width: particle.size,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  burstRoot: {
    height: 1,
    position: 'absolute',
    width: 1,
  },
  flash: {
    borderRadius: 18,
    height: 36,
    left: -18,
    position: 'absolute',
    top: -18,
    width: 36,
  },
  ring: {
    borderRadius: 28,
    borderWidth: 2,
    height: 56,
    left: -28,
    position: 'absolute',
    top: -28,
    width: 56,
  },
  particle: {
    borderRadius: 8,
    left: -4,
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 9,
    top: -4,
  },
});

export default FireworkBurstView;
