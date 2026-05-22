export type HeartbeatApiConfig = {
  host?: string;
  port?: number | string;
  path?: string;
  url?: string;
};

export type HeartbeatApiHandlers = {
  onOpen?: () => void;
  onMessage?: (message: string) => void;
  onClose?: (event?: WebSocketCloseEvent) => void;
  onError?: (event?: WebSocketErrorEvent) => void;
};

export type WebSocketFactory = (url: string) => WebSocket;

export const defaultHeartbeatApiConfig: Required<
  Pick<HeartbeatApiConfig, 'host' | 'port' | 'path'>
> = {
  host: '127.0.0.1',
  port: '8080',
  path: '/ws',
};

export function createHeartbeatWebSocketURL(config: HeartbeatApiConfig = {}) {
  if (config.url) {
    return config.url.trim();
  }

  const host = (config.host ?? defaultHeartbeatApiConfig.host).trim();
  const port = config.port ?? defaultHeartbeatApiConfig.port;
  const path = normalizePath(config.path ?? defaultHeartbeatApiConfig.path);

  if (!host) {
    throw new Error('Heartbeat WebSocket host is required.');
  }

  return `ws://${host}${formatPort(port)}${path}`;
}

class HeartbeatApi {
  private socket?: WebSocket;
  private readonly createSocket: WebSocketFactory;
  private readonly url: string;

  constructor(config: HeartbeatApiConfig = {}, createSocket?: WebSocketFactory) {
    this.url = createHeartbeatWebSocketURL(config);
    this.createSocket = createSocket ?? (socketURL => new WebSocket(socketURL));
  }

  get endpoint() {
    return this.url;
  }

  get readyState() {
    return this.socket?.readyState;
  }

  connect(handlers: HeartbeatApiHandlers = {}) {
    this.close();

    const socket = this.createSocket(this.url);
    this.socket = socket;

    socket.onopen = () => {
      handlers.onOpen?.();
    };
    socket.onmessage = event => {
      handlers.onMessage?.(String(event.data));
    };
    socket.onclose = event => {
      handlers.onClose?.(event);
    };
    socket.onerror = event => {
      handlers.onError?.(event);
    };
  }

  send(message: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected.');
    }

    this.socket.send(message);
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
}

function formatPort(port: HeartbeatApiConfig['port']) {
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

export default HeartbeatApi;
