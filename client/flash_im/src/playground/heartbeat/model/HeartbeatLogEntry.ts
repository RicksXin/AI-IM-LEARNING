export type HeartbeatLogType =
  | 'connect'
  | 'open'
  | 'send'
  | 'receive'
  | 'close'
  | 'error'
  | 'info';

export type HeartbeatLogEntry = {
  id: string;
  type: HeartbeatLogType;
  message: string;
  time: string;
};

export function createHeartbeatLogEntry(
  type: HeartbeatLogType,
  message: string,
  date = new Date(),
): HeartbeatLogEntry {
  return {
    id: `${date.getTime()}-${Math.random().toString(36).slice(2)}`,
    type,
    message,
    time: date.toLocaleTimeString('zh-CN', { hour12: false }),
  };
}
