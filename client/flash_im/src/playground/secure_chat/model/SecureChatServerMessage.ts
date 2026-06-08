export type SecureChatServerMessageType =
  | 'auth_required'
  | 'auth_success'
  | 'auth_failed'
  | 'chat'
  | 'error'
  | 'pong';

export type SecureChatServerMessage = {
  content?: string;
  message?: string;
  nickname?: string;
  time?: string;
  type: SecureChatServerMessageType;
  user_id?: string;
};

const knownMessageTypes = new Set<string>([
  'auth_required',
  'auth_success',
  'auth_failed',
  'chat',
  'error',
  'pong',
]);

export function parseSecureChatServerMessage(
  rawMessage: string,
): SecureChatServerMessage {
  const parsed = JSON.parse(rawMessage) as {
    content?: unknown;
    message?: unknown;
    nickname?: unknown;
    time?: unknown;
    type?: unknown;
    user_id?: unknown;
  };

  if (typeof parsed.type !== 'string' || !knownMessageTypes.has(parsed.type)) {
    throw new Error('Secure chat message type is invalid.');
  }

  return {
    content: readOptionalString(parsed.content, 'content'),
    message: readOptionalString(parsed.message, 'message'),
    nickname: readOptionalString(parsed.nickname, 'nickname'),
    time: readOptionalString(parsed.time, 'time'),
    type: parsed.type as SecureChatServerMessageType,
    user_id: readOptionalString(parsed.user_id, 'user_id'),
  };
}

function readOptionalString(value: unknown, fieldName: string) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`Secure chat field "${fieldName}" must be a string.`);
  }

  return value;
}
