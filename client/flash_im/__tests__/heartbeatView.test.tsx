/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { createHeartbeatLogEntry } from '../src/playground/heartbeat';
import HeartbeatScreen from '../src/playground/heartbeat/view/HeartbeatScreen';

jest.mock('react-native-safe-area-context', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) =>
      ReactMock.createElement(View, props, children),
  };
});

test('heartbeat screen renders status, endpoint, and actions', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  const onConnect = jest.fn();
  const onSendHeartbeat = jest.fn();

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <HeartbeatScreen
        endpointLabel="ws://127.0.0.1:8080/ws"
        heartbeatIntervalSeconds={5}
        host="127.0.0.1"
        lastHeartbeatAt="10:00:00"
        logs={[createHeartbeatLogEntry('receive', 'welcome')]}
        port="8080"
        status="connected"
        onBack={jest.fn()}
        onClearLogs={jest.fn()}
        onConnect={onConnect}
        onDisconnect={jest.fn()}
        onHostChange={jest.fn()}
        onPortChange={jest.fn()}
        onSendHeartbeat={onSendHeartbeat}
      />,
    );
  });

  const output = JSON.stringify(renderer?.toJSON());
  expect(output).toContain('心跳通信');
  expect(output).toContain('已连接');
  expect(output).toContain('ws://127.0.0.1:8080/ws');
  expect(output).toContain('welcome');

  const sendButton = renderer?.root.findByProps({
    accessibilityLabel: '发送心跳',
  });
  await ReactTestRenderer.act(async () => {
    sendButton?.props.onPress();
  });

  expect(onSendHeartbeat).toHaveBeenCalledTimes(1);
  expect(onConnect).not.toHaveBeenCalled();
});
