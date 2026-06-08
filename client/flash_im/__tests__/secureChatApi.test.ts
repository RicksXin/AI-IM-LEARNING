/**
 * @format
 */

import {
  createSecureChatWebSocketURL,
  getSecureChatConnectionStatusLabel,
  SecureChatApi,
} from '../src/playground/secure_chat';

const originalWebSocket = global.WebSocket;

class FakeWebSocket {
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  readyState = 0;
  sentMessages: string[] = [];

  open() {
    this.readyState = WebSocket.OPEN;
    this.onopen?.({} as Event);
  }

  receive(data: string) {
    this.onmessage?.({ data } as MessageEvent);
  }

  send(message: string) {
    this.sentMessages.push(message);
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.({ code: 1000 } as CloseEvent);
  }
}

beforeEach(() => {
  global.WebSocket = {
    CLOSED: 3,
    CLOSING: 2,
    OPEN: 1,
  } as typeof WebSocket;
});

afterEach(() => {
  global.WebSocket = originalWebSocket;
});

test('secure chat websocket URL can be configured by host and port', () => {
  expect(
    createSecureChatWebSocketURL({
      host: '192.168.1.23',
      port: '9090',
    }),
  ).toBe('ws://192.168.1.23:9090/chat_room');
});

test('secure chat websocket URL can use a full URL override', () => {
  expect(
    createSecureChatWebSocketURL({
      url: 'ws://example.com/room',
    }),
  ).toBe('ws://example.com/room');
});

test('secure chat websocket URL rejects an empty host', () => {
  expect(() =>
    createSecureChatWebSocketURL({
      host: '  ',
    }),
  ).toThrow('Secure chat WebSocket host is required.');
});

test('secure chat connection status labels match the playground copy', () => {
  expect(getSecureChatConnectionStatusLabel('connecting')).toBe('连接中');
  expect(getSecureChatConnectionStatusLabel('authenticating')).toBe('认证中');
  expect(getSecureChatConnectionStatusLabel('connected')).toBe('已连接');
  expect(getSecureChatConnectionStatusLabel('disconnected')).toBe('未连接');
});

test('secure chat api connects, authenticates, pings, chats, and closes without UI', () => {
  let socket: FakeWebSocket | undefined;
  const events: string[] = [];
  const api = new SecureChatApi({ url: 'ws://localhost:8080/chat_room' }, url => {
    expect(url).toBe('ws://localhost:8080/chat_room');
    socket = new FakeWebSocket();
    return socket as unknown as WebSocket;
  });

  api.connect({
    onClose: () => events.push('close'),
    onMessage: message => events.push(`message:${message}`),
    onOpen: () => events.push('open'),
  });

  socket?.open();
  socket?.receive('{"type":"auth_required","message":"send auth"}');
  api.sendAuth('jwt-token');
  socket?.receive('{"type":"auth_success","user_id":"u_000001"}');
  api.sendPing();
  api.sendChat('hello');
  api.close();

  expect(events).toEqual([
    'open',
    'message:{"type":"auth_required","message":"send auth"}',
    'message:{"type":"auth_success","user_id":"u_000001"}',
    'close',
  ]);
  expect(socket?.sentMessages).toEqual([
    '{"token":"jwt-token","type":"auth"}',
    '{"type":"ping"}',
    '{"content":"hello","type":"chat"}',
  ]);
});

test('secure chat api rejects sending before websocket is connected', () => {
  const api = new SecureChatApi({ url: 'ws://localhost:8080/chat_room' }, () => {
    return new FakeWebSocket() as unknown as WebSocket;
  });

  api.connect();

  expect(() => api.sendAuth('jwt-token')).toThrow(
    'Secure chat WebSocket is not connected.',
  );
});
