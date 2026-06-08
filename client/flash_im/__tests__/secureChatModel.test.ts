/**
 * @format
 */

import {
  createSecureChatMessage,
  parseSecureChatServerMessage,
} from '../src/playground/secure_chat';

test('secure chat parser maps auth and chat server messages', () => {
  expect(
    parseSecureChatServerMessage(
      '{"type":"auth_success","message":"ok","user_id":"u_000001"}',
    ),
  ).toEqual({
    content: undefined,
    message: 'ok',
    nickname: undefined,
    time: undefined,
    type: 'auth_success',
    user_id: 'u_000001',
  });

  expect(
    parseSecureChatServerMessage(
      '{"type":"chat","user_id":"u_000001","nickname":"Alice","content":"hello","time":"10:00:00"}',
    ),
  ).toEqual({
    content: 'hello',
    message: undefined,
    nickname: 'Alice',
    time: '10:00:00',
    type: 'chat',
    user_id: 'u_000001',
  });
});

test('secure chat parser rejects invalid message shape', () => {
  expect(() => parseSecureChatServerMessage('{"type":"unknown"}')).toThrow(
    'Secure chat message type is invalid.',
  );

  expect(() =>
    parseSecureChatServerMessage('{"type":"chat","content":123}'),
  ).toThrow('Secure chat field "content" must be a string.');
});

test('secure chat message factory creates display messages', () => {
  expect(
    createSecureChatMessage('outgoing', 'hello', {
      id: 'message-1',
      senderName: '我',
      time: '10:00:00',
    }),
  ).toEqual({
    content: 'hello',
    id: 'message-1',
    kind: 'outgoing',
    senderName: '我',
    time: '10:00:00',
  });
});
