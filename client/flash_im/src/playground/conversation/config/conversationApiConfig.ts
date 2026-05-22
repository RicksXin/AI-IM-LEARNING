export type ConversationApiConfig = {
  protocol?: 'http' | 'https';
  host?: string;
  port?: number | string;
  basePath?: string;
  baseURL?: string;
  timeoutMs?: number;
};

export const defaultConversationApiConfig: Required<
  Pick<ConversationApiConfig, 'protocol' | 'host' | 'port' | 'timeoutMs'>
> = {
  protocol: 'http',
  host: '127.0.0.1',
  port: '8080',
  timeoutMs: 8000,
};

export function createConversationBaseURL(config: ConversationApiConfig = {}) {
  if (config.baseURL) {
    return trimTrailingSlash(config.baseURL.trim());
  }

  const protocol = config.protocol ?? defaultConversationApiConfig.protocol;
  const host = (config.host ?? defaultConversationApiConfig.host).trim();
  const port = config.port ?? defaultConversationApiConfig.port;
  const basePath = normalizeBasePath(config.basePath);

  if (!host) {
    throw new Error('Conversation API host is required.');
  }

  return `${protocol}://${host}${formatPort(port)}${basePath}`;
}

function formatPort(port: ConversationApiConfig['port']) {
  if (port === undefined || port === '') {
    return '';
  }

  return `:${port}`;
}

function normalizeBasePath(basePath: ConversationApiConfig['basePath']) {
  if (!basePath) {
    return '';
  }

  const trimmed = basePath.trim();
  if (!trimmed) {
    return '';
  }

  return `/${trimSlashes(trimmed)}`;
}

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, '');
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/g, '');
}
