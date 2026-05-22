/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Conversation } from '../src/playground/conversation';
import ConversationScreen from '../src/playground/conversation/view/ConversationScreen';

jest.mock('react-native-safe-area-context', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) =>
      ReactMock.createElement(View, props, children),
  };
});

test('conversation screen renders list rows and the wechat tab bar', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  const onRefresh = jest.fn();

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <ConversationScreen
        conversations={[
          new Conversation({
            title: '星月沼沼',
            lastMsg: 'qwq 主要是咱们这边不是主做软件/app 分享...',
            time: '1月8日',
          }),
        ]}
        endpointLabel="http://127.0.0.1:8080/conversation"
        host="127.0.0.1"
        isLoading={false}
        port="8080"
        onBack={jest.fn()}
        onHostChange={jest.fn()}
        onPortChange={jest.fn()}
        onRefresh={onRefresh}
      />,
    );
  });

  expect(JSON.stringify(renderer?.toJSON())).toContain('星月沼沼');
  expect(JSON.stringify(renderer?.toJSON())).toContain('1月8日');
  expect(JSON.stringify(renderer?.toJSON())).toContain('微信');
  expect(JSON.stringify(renderer?.toJSON())).toContain('通讯录');
  expect(JSON.stringify(renderer?.toJSON())).toContain('发现');
  expect(JSON.stringify(renderer?.toJSON())).toContain('我');

  const refreshButton = renderer?.root.findByProps({
    accessibilityLabel: '刷新会话列表',
  });

  await ReactTestRenderer.act(async () => {
    refreshButton?.props.onPress();
  });

  expect(onRefresh).toHaveBeenCalledTimes(1);
});
