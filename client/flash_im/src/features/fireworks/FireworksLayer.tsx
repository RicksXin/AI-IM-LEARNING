import React from 'react';
import { StyleSheet, View } from 'react-native';
import FireworkBurstView from './FireworkBurstView';
import type { FireworkBurst } from './types';

type FireworksLayerProps = {
  bursts: FireworkBurst[];
  onBurstDone: (id: string) => void;
};

function FireworksLayer({ bursts, onBurstDone }: FireworksLayerProps) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bursts.map(burst => (
        <FireworkBurstView
          key={burst.id}
          burst={burst}
          onDone={onBurstDone}
        />
      ))}
    </View>
  );
}

export default FireworksLayer;
