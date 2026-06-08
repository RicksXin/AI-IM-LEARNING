import axios from 'axios';
import type { AxiosInstance } from 'axios';
import AuthSession, { AuthSessionJson } from '../model/AuthSession';
import AuthSmsResult, { AuthSmsResultJson } from '../model/AuthSmsResult';
import {
  playgroundAuthTokenStore,
  type AuthTokenStore,
} from '../model/AuthTokenStore';
import AuthUserProfile, {
  AuthUserProfileJson,
} from '../model/AuthUserProfile';

export type AuthApiConfig = {
  basePath?: string;
  baseURL?: string;
  host?: string;
  port?: number | string;
  protocol?: 'http' | 'https';
  timeoutMs?: number;
};

export type AuthRequestConfig = {
  headers?: Record<string, string>;
};

export type AuthHttpClient = {
  get<T = unknown>(
    url: string,
    config?: AuthRequestConfig,
  ): Promise<{ data: T }>;
  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AuthRequestConfig,
  ): Promise<{ data: T }>;
};

export type AuthApiOptions = {
  client?: AuthHttpClient;
  config?: AuthApiConfig;
  tokenStore?: AuthTokenStore;
};

export const AUTH_SMS_PATH = '/auth/sms';
export const AUTH_LOGIN_PATH = '/auth/login';
export const AUTH_PROFILE_PATH = '/user/profile';

export const defaultAuthApiConfig: Required<
  Pick<AuthApiConfig, 'host' | 'port' | 'protocol' | 'timeoutMs'>
> = {
  host: '127.0.0.1',
  port: '8080',
  protocol: 'http',
  timeoutMs: 8000,
};

export function createAuthBaseURL(config: AuthApiConfig = {}) {
  if (config.baseURL) {
    return trimTrailingSlash(config.baseURL.trim());
  }

  const protocol = config.protocol ?? defaultAuthApiConfig.protocol;
  const host = (config.host ?? defaultAuthApiConfig.host).trim();
  const port = config.port ?? defaultAuthApiConfig.port;
  const basePath = normalizeBasePath(config.basePath);

  if (!host) {
    throw new Error('Auth API host is required.');
  }

  return `${protocol}://${host}${formatPort(port)}${basePath}`;
}

export function createAuthHttpClient(
  config: AuthApiConfig = {},
): AxiosInstance {
  return axios.create({
    baseURL: createAuthBaseURL(config),
    timeout: config.timeoutMs ?? defaultAuthApiConfig.timeoutMs,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
}

class AuthApi {
  private readonly client: AuthHttpClient;
  private readonly tokenStore: AuthTokenStore;

  constructor(options: AuthApiOptions = {}) {
    this.client = options.client ?? createAuthHttpClient(options.config ?? {});
    this.tokenStore = options.tokenStore ?? playgroundAuthTokenStore;
  }

  async sendSms(phone: string) {
    const response = await this.client.post<AuthSmsResultJson>(AUTH_SMS_PATH, {
      phone,
    });

    return AuthSmsResult.fromJson(response.data);
  }

  async login(phone: string, code: string) {
    const response = await this.client.post<AuthSessionJson>(AUTH_LOGIN_PATH, {
      code,
      phone,
    });
    const session = AuthSession.fromJson(response.data);

    this.tokenStore.saveToken(session.token);

    return session;
  }

  async fetchProfile() {
    const token = this.tokenStore.getToken();

    if (!token) {
      throw new Error('Auth token is missing.');
    }

    const response = await this.client.get<AuthUserProfileJson>(
      AUTH_PROFILE_PATH,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return AuthUserProfile.fromJson(response.data);
  }

  logout() {
    this.tokenStore.clearToken();
  }
}

function formatPort(port: AuthApiConfig['port']) {
  if (port === undefined || port === '') {
    return '';
  }

  return `:${port}`;
}

function normalizeBasePath(basePath: AuthApiConfig['basePath']) {
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

export default AuthApi;
