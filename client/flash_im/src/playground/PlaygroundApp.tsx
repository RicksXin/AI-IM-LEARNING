import React, { useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FireworksPlayground from './cases/FireworksPlayground';
import PlaygroundHome from './PlaygroundHome';

type PlaygroundCase = 'home' | 'fireworks';

function PlaygroundApp() {
  const [activeCase, setActiveCase] = useState<PlaygroundCase>('home');

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0b1020" />
      {activeCase === 'fireworks' ? (
        <FireworksPlayground onBack={() => setActiveCase('home')} />
      ) : (
        <PlaygroundHome onOpenFireworks={() => setActiveCase('fireworks')} />
      )}
    </SafeAreaProvider>
  );
}

export default PlaygroundApp;
