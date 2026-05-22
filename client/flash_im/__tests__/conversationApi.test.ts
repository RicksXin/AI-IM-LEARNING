/**
 * @format
 */

import {
  Conversation,
  ConversationApi,
  createConversationBaseURL,
  createConversationHttpClient,
} from '../src/playground/conversation';
import type { ConversationHttpClient } from '../src/playground/conversation';

test('conversation base URL can be configured by host and port', () => {
  expect(
    createConversationBaseURL({
      host: '192.168.1.23',
      port: '9090',
    }),
  ).toBe('http://192.168.1.23:9090');
});

test('conversation base URL can use a full baseURL override', () => {
  expect(
    createConversationBaseURL({
      baseURL: 'https://example.com/api/',
    }),
  ).toBe('https://example.com/api');
});

test('conversation http client applies base URL and timeout', () => {
  const client = createConversationHttpClient({
    host: '10.0.2.2',
    port: '8088',
    timeoutMs: 1200,
  });

  expect(client.defaults.baseURL).toBe('http://10.0.2.2:8088');
  expect(client.defaults.timeout).toBe(1200);
});

test('conversation entity maps backend response fields', () => {
  const conversation = Conversation.fromJson({
    title: '产品体验群',
    lastMsg: '今晚把登录流程再过一遍。',
    time: '09:12',
  });

  expect(conversation).toEqual(
    new Conversation({
      title: '产品体验群',
      lastMsg: '今晚把登录流程再过一遍。',
      time: '09:12',
    }),
  );
});

test('conversation api fetches and maps conversations with an injected client', async () => {
  const client: ConversationHttpClient = {
    get: jest.fn().mockResolvedValue({
      data: [
        {
          title: '后端开发小组',
          lastMsg: '我刚把 /v 接口跑通了。',
          time: '09:24',
        },
      ],
    }),
  };
  const api = new ConversationApi({ client });

  await expect(api.fetchConversations()).resolves.toEqual([
    new Conversation({
      title: '后端开发小组',
      lastMsg: '我刚把 /v 接口跑通了。',
      time: '09:24',
    }),
  ]);
  expect(client.get).toHaveBeenCalledWith('/conversation');
});

test('conversation api rejects invalid response shape', async () => {
  const client: ConversationHttpClient = {
    get: jest.fn().mockResolvedValue({
      data: {
        title: 'not an array',
      },
    }),
  };
  const api = new ConversationApi({ client });

  await expect(api.fetchConversations()).rejects.toThrow(
    'Conversation response must be an array.',
  );
});
