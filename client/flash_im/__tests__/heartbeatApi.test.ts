/**
 * @format
 */

import {
  createHeartbeatWebSocketURL,
  getHeartbeatConnectionStatusLabel,
  HeartbeatApi,
} from '../src/playground/heartbeat';

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

test('heartbeat websocket URL can be configured by host and port', () => {
  expect(
    createHeartbeatWebSocketURL({
      host: '192.168.1.23',
      port: '9090',
    }),
  ).toBe('ws://192.168.1.23:9090/ws');
});

test('heartbeat websocket URL can use a full URL override', () => {
  expect(
    createHeartbeatWebSocketURL({
      url: 'ws://example.com/custom',
    }),
  ).toBe('ws://example.com/custom');
});

test('heartbeat connection status labels match the playground copy', () => {
  expect(getHeartbeatConnectionStatusLabel('connecting')).toBe('连接中');
  expect(getHeartbeatConnectionStatusLabel('connected')).toBe('已连接');
  expect(getHeartbeatConnectionStatusLabel('disconnected')).toBe('已断开');
});

test('heartbeat api connects, receives messages, sends heartbeats, and closes without UI', () => {
  let socket: FakeWebSocket | undefined;
  const events: string[] = [];
  const api = new HeartbeatApi({ url: 'ws://localhost:8080/ws' }, url => {
    expect(url).toBe('ws://localhost:8080/ws');
    socket = new FakeWebSocket();
    return socket as unknown as WebSocket;
  });

  api.connect({
    onClose: () => events.push('close'),
    onMessage: message => events.push(`message:${message}`),
    onOpen: () => events.push('open'),
  });

  socket?.open();
  socket?.receive('welcome to websocket playground');
  api.send('ping');
  socket?.receive('echo: ping');
  api.close();

  expect(events).toEqual([
    'open',
    'message:welcome to websocket playground',
    'message:echo: ping',
    'close',
  ]);
  expect(socket?.sentMessages).toEqual(['ping']);
});

test('heartbeat api rejects sending before websocket is connected', () => {
  const api = new HeartbeatApi({ url: 'ws://localhost:8080/ws' }, () => {
    return new FakeWebSocket() as unknown as WebSocket;
  });

  api.connect();

  expect(() => api.send('ping')).toThrow('WebSocket is not connected.');
});
