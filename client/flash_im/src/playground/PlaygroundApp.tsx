import React, { useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthPlayground from './cases/AuthPlayground';
import ConversationPlayground from './cases/ConversationPlayground';
import FireworksPlayground from './cases/FireworksPlayground';
import HeartbeatPlayground from './cases/HeartbeatPlayground';
import SecureChatPlayground from './cases/SecureChatPlayground';
import PlaygroundHome from './PlaygroundHome';

type PlaygroundCase =
  | 'home'
  | 'fireworks'
  | 'conversation'
  | 'heartbeat'
  | 'auth'
  | 'secureChat';

function PlaygroundApp() {
  const [activeCase, setActiveCase] = useState<PlaygroundCase>('home');

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0b1020" />
      {activeCase === 'heartbeat' ? (
        <HeartbeatPlayground onBack={() => setActiveCase('home')} />
      ) : activeCase === 'secureChat' ? (
        <SecureChatPlayground onBack={() => setActiveCase('home')} />
      ) : activeCase === 'auth' ? (
        <AuthPlayground onBack={() => setActiveCase('home')} />
      ) : activeCase === 'conversation' ? (
        <ConversationPlayground onBack={() => setActiveCase('home')} />
      ) : activeCase === 'fireworks' ? (
        <FireworksPlayground onBack={() => setActiveCase('home')} />
      ) : (
        <PlaygroundHome
          onOpenAuth={() => setActiveCase('auth')}
          onOpenConversation={() => setActiveCase('conversation')}
          onOpenFireworks={() => setActiveCase('fireworks')}
          onOpenHeartbeat={() => setActiveCase('heartbeat')}
          onOpenSecureChat={() => setActiveCase('secureChat')}
        />
      )}
    </SafeAreaProvider>
  );
}

export default PlaygroundApp;
