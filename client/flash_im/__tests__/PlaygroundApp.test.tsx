/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import PlaygroundApp from '../src/playground/PlaygroundApp';

jest.mock('react-native-safe-area-context', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      ReactMock.createElement(View, null, children),
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) =>
      ReactMock.createElement(View, props, children),
    useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
  };
});

test('playground app exposes playground cases', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<PlaygroundApp />);
  });

  const fireworksButtons = renderer?.root.findAll(
    node =>
      node.props.accessibilityLabel === '打开烟花秀案例' &&
      typeof node.props.onPress === 'function',
  );

  const conversationButtons = renderer?.root.findAll(
    node =>
      node.props.accessibilityLabel === '打开会话请求案例' &&
      typeof node.props.onPress === 'function',
  );

  const heartbeatButtons = renderer?.root.findAll(
    node =>
      node.props.accessibilityLabel === '打开心跳通信案例' &&
      typeof node.props.onPress === 'function',
  );

  const authButtons = renderer?.root.findAll(
    node =>
      node.props.accessibilityLabel === '打开用户认证案例' &&
      typeof node.props.onPress === 'function',
  );

  const secureChatButtons = renderer?.root.findAll(
    node =>
      node.props.accessibilityLabel === '打开认证聊天室案例' &&
      typeof node.props.onPress === 'function',
  );

  expect(fireworksButtons).toHaveLength(1);
  expect(conversationButtons).toHaveLength(1);
  expect(heartbeatButtons).toHaveLength(1);
  expect(authButtons).toHaveLength(1);
  expect(secureChatButtons).toHaveLength(1);
  expect(JSON.stringify(renderer?.toJSON())).toContain('烟花秀');
  expect(JSON.stringify(renderer?.toJSON())).toContain('conversation');
  expect(JSON.stringify(renderer?.toJSON())).toContain('心跳通信');
  expect(JSON.stringify(renderer?.toJSON())).toContain('用户认证');
  expect(JSON.stringify(renderer?.toJSON())).toContain('认证聊天室');
});
