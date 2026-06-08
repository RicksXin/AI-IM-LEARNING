export type SecureChatConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'authenticating'
  | 'connected'
  | 'error';

export function getSecureChatConnectionStatusLabel(
  status: SecureChatConnectionStatus,
) {
  switch (status) {
    case 'connecting':
      return '连接中';
    case 'authenticating':
      return '认证中';
    case 'connected':
      return '已连接';
    case 'error':
      return '连接异常';
    case 'disconnected':
    default:
      return '未连接';
  }
}

export function isSecureChatConnected(status: SecureChatConnectionStatus) {
  return status === 'connected';
}
