export type HeartbeatConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export function getHeartbeatConnectionStatusLabel(
  status: HeartbeatConnectionStatus,
) {
  switch (status) {
    case 'connecting':
      return '连接中';
    case 'connected':
      return '已连接';
    case 'error':
      return '连接异常';
    case 'disconnected':
    default:
      return '已断开';
  }
}

export function isHeartbeatConnected(status: HeartbeatConnectionStatus) {
  return status === 'connected';
}
