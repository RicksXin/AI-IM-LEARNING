export type SecureChatMessageKind = 'system' | 'incoming' | 'outgoing';
export type SecureChatDeliveryStatus = 'sending' | 'delivered' | 'failed';

export type SecureChatMessage = {
  content: string;
  deliveryStatus?: SecureChatDeliveryStatus;
  id: string;
  kind: SecureChatMessageKind;
  senderName?: string;
  time: string;
};

export function createSecureChatMessage(
  kind: SecureChatMessageKind,
  content: string,
  options: {
    id?: string;
    deliveryStatus?: SecureChatDeliveryStatus;
    senderName?: string;
    time?: string;
  } = {},
): SecureChatMessage {
  return {
    content,
    deliveryStatus: options.deliveryStatus,
    id: options.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    senderName: options.senderName,
    time: options.time ?? new Date().toLocaleTimeString('zh-CN', {
      hour12: false,
    }),
  };
}
