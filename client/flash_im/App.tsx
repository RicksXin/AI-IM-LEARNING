import React, { useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FireworksShowScreen from './src/screens/FireworksShowScreen';
import HomeScreen from './src/screens/HomeScreen';

type Screen = 'home' | 'fireworks';

function App() {
  const [screen, setScreen] = useState<Screen>('home');

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#050510" />
      {screen === 'home' ? (
        <HomeScreen onOpenFireworks={() => setScreen('fireworks')} />
      ) : (
        <FireworksShowScreen onBack={() => setScreen('home')} />
      )}
    </SafeAreaProvider>
  );
}

export default App;
