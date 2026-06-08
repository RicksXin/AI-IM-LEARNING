export type SecureChatApiConfig = {
  host?: string;
  path?: string;
  port?: number | string;
  url?: string;
};

export type SecureChatApiHandlers = {
  onClose?: (event?: WebSocketCloseEvent) => void;
  onError?: (event?: WebSocketErrorEvent) => void;
  onMessage?: (message: string) => void;
  onOpen?: () => void;
};

export type SecureChatWebSocketFactory = (url: string) => WebSocket;

export const defaultSecureChatApiConfig: Required<
  Pick<SecureChatApiConfig, 'host' | 'path' | 'port'>
> = {
  host: '127.0.0.1',
  path: '/chat_room',
  port: '8080',
};

export function createSecureChatWebSocketURL(
  config: SecureChatApiConfig = {},
) {
  if (config.url) {
    return config.url.trim();
  }

  const host = (config.host ?? defaultSecureChatApiConfig.host).trim();
  const port = config.port ?? defaultSecureChatApiConfig.port;
  const path = normalizePath(config.path ?? defaultSecureChatApiConfig.path);

  if (!host) {
    throw new Error('Secure chat WebSocket host is required.');
  }

  return `ws://${host}${formatPort(port)}${path}`;
}

class SecureChatApi {
  private socket?: WebSocket;
  private readonly createSocket: SecureChatWebSocketFactory;
  private readonly url: string;

  constructor(
    config: SecureChatApiConfig = {},
    createSocket?: SecureChatWebSocketFactory,
  ) {
    this.url = createSecureChatWebSocketURL(config);
    this.createSocket = createSocket ?? (socketURL => new WebSocket(socketURL));
  }

  get endpoint() {
    return this.url;
  }

  get readyState() {
    return this.socket?.readyState;
  }

  connect(handlers: SecureChatApiHandlers = {}) {
    this.close();

    const socket = this.createSocket(this.url);
    this.socket = socket;

    socket.onopen = () => {
      handlers.onOpen?.();
    };
    socket.onmessage = event => {
      const messageData = event.data as unknown;

      if (typeof messageData === 'string') {
        handlers.onMessage?.(messageData);
        return;
      }

      readWebSocketMessageData(messageData)
        .then(message => handlers.onMessage?.(message))
        .catch(() => handlers.onError?.());
    };
    socket.onclose = event => {
      handlers.onClose?.(event);
    };
    socket.onerror = event => {
      handlers.onError?.(event);
    };
  }

  sendAuth(token: string) {
    this.sendJson({
      token,
      type: 'auth',
    });
  }

  sendPing() {
    this.sendJson({
      type: 'ping',
    });
  }

  sendChat(content: string) {
    this.sendJson({
      content,
      type: 'chat',
    });
  }

  close() {
    if (
      this.socket &&
      this.socket.readyState !== WebSocket.CLOSED &&
      this.socket.readyState !== WebSocket.CLOSING
    ) {
      this.socket.close();
    }
  }

  private sendJson(payload: Record<string, string>) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Secure chat WebSocket is not connected.');
    }

    this.socket.send(JSON.stringify(payload));
  }
}

function formatPort(port: SecureChatApiConfig['port']) {
  if (port === undefined || port === '') {
    return '';
  }

  return `:${port}`;
}

function normalizePath(path: string) {
  const trimmed = path.trim();

  if (!trimmed) {
    return '';
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

async function readWebSocketMessageData(data: unknown) {
  if (data instanceof ArrayBuffer) {
    return decodeArrayBuffer(data);
  }

  if (
    data &&
    typeof (data as { text?: unknown }).text === 'function'
  ) {
    return (data as { text: () => Promise<string> }).text();
  }

  return String(data);
}

function decodeArrayBuffer(buffer: ArrayBuffer) {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(buffer);
  }

  return String.fromCharCode(...Array.from(new Uint8Array(buffer)));
}

export default SecureChatApi;
