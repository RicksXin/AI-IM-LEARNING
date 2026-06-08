import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AuthApi,
  clearAuthToken,
  createAuthBaseURL,
  defaultAuthApiConfig,
} from '../auth';
import type AuthUserProfile from '../auth/model/AuthUserProfile';
import { getDefaultPlaygroundHost } from '../config/playgroundNetwork';
import {
  createSecureChatMessage,
  createSecureChatWebSocketURL,
  parseSecureChatServerMessage,
  SecureChatApi,
} from '../secure_chat';
import type {
  SecureChatConnectionStatus,
  SecureChatMessage,
} from '../secure_chat';
import type { SecureChatTab } from '../secure_chat/view/SecureChatBottomTabs';
import SecureChatScreen from '../secure_chat/view/SecureChatScreen';

type SecureChatPlaygroundProps = {
  onBack: () => void;
};

const SMS_COUNTDOWN_SECONDS = 60;
const HEARTBEAT_INTERVAL_MS = 10000;

function SecureChatPlayground({ onBack }: SecureChatPlaygroundProps) {
  const [activeTab, setActiveTab] = useState<SecureChatTab>('chat');
  const [host, setHost] = useState(getDefaultPlaygroundHost());
  const [port, setPort] = useState(String(defaultAuthApiConfig.port));
  const [phone, setPhone] = useState('13800000001');
  const [code, setCode] = useState('');
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [statusMessage, setStatusMessage] = useState<string | undefined>(
    '在我的页面登录后，聊天室会使用 JWT 完成 WebSocket 认证。',
  );
  const [profile, setProfile] = useState<AuthUserProfile | undefined>();
  const [authToken, setAuthToken] = useState<string | undefined>();
  const [status, setStatus] =
    useState<SecureChatConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<SecureChatMessage[]>([
    createSecureChatMessage('system', '认证聊天室已准备就绪。'),
  ]);
  const [draft, setDraft] = useState('');
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<string | undefined>();
  const chatApiRef = useRef<SecureChatApi | undefined>(undefined);
  const currentUserIdRef = useRef<string | undefined>(undefined);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );

  const endpointLabel = useMemo(() => {
    try {
      return createSecureChatWebSocketURL({ host, port });
    } catch {
      return '请输入 WebSocket 地址';
    }
  }, [host, port]);

  const authEndpointLabel = useMemo(() => {
    try {
      return createAuthBaseURL({ host, port });
    } catch {
      return '请输入 HTTP 地址';
    }
  }, [host, port]);

  const tokenPreview = authToken
    ? authToken.length <= 24
      ? authToken
      : `${authToken.slice(0, 12)}...${authToken.slice(-8)}`
    : undefined;

  const appendMessage = useCallback((message: SecureChatMessage) => {
    setMessages(current => [...current, message].slice(-80));
  }, []);

  const updateMessage = useCallback(
    (
      messageId: string,
      updater: (message: SecureChatMessage) => SecureChatMessage,
    ) => {
      setMessages(current =>
        current.map(message =>
          message.id === messageId ? updater(message) : message,
        ),
      );
    },
    [],
  );

  const appendSystemMessage = useCallback(
    (content: string) => {
      appendMessage(createSecureChatMessage('system', content));
    },
    [appendMessage],
  );

  const stopHeartbeatTimer = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = undefined;
    }
  }, []);

  const sendHeartbeat = useCallback(() => {
    try {
      chatApiRef.current?.sendPing();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '聊天室心跳发送失败',
      );
    }
  }, []);

  const startHeartbeatTimer = useCallback(() => {
    stopHeartbeatTimer();
    heartbeatTimerRef.current = setInterval(() => {
      sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);
  }, [sendHeartbeat, stopHeartbeatTimer]);

  const createAuthApi = useCallback(() => {
    return new AuthApi({
      config: {
        host,
        port,
      },
    });
  }, [host, port]);

  const connectChatRoom = useCallback(
    (token: string) => {
      stopHeartbeatTimer();
      chatApiRef.current?.close();
      setErrorMessage(undefined);
      setStatus('connecting');
      appendSystemMessage(`正在连接 ${endpointLabel}`);

      const api = new SecureChatApi({ host, port });
      chatApiRef.current = api;
      api.connect({
        onClose: () => {
          stopHeartbeatTimer();
          setStatus(current => (current === 'error' ? current : 'disconnected'));
          appendSystemMessage('聊天室连接已断开。');
        },
        onError: () => {
          stopHeartbeatTimer();
          setStatus('error');
          setErrorMessage('聊天室连接异常，请确认后端是否运行。');
          appendSystemMessage('聊天室连接异常。');
        },
        onMessage: rawMessage => {
          try {
            const serverMessage = parseSecureChatServerMessage(rawMessage);

            switch (serverMessage.type) {
              case 'auth_required':
                appendSystemMessage('服务端要求认证，正在发送 JWT。');
                break;
              case 'auth_success':
                setStatus('connected');
                setStatusMessage('WebSocket 已完成 JWT 认证。');
                appendSystemMessage('WebSocket JWT 认证成功。');
                startHeartbeatTimer();
                break;
              case 'auth_failed':
                stopHeartbeatTimer();
                setStatus('error');
                setErrorMessage(serverMessage.message ?? 'WebSocket 认证失败');
                appendSystemMessage(serverMessage.message ?? 'WebSocket 认证失败。');
                break;
              case 'pong':
                setLastHeartbeatAt(
                  serverMessage.time ??
                    new Date().toLocaleTimeString('zh-CN', { hour12: false }),
                );
                break;
              case 'chat':
                if (serverMessage.user_id === currentUserIdRef.current) {
                  setMessages(current => {
                    const pendingMessageIndex = current.findIndex(
                      message =>
                        message.kind === 'outgoing' &&
                        message.deliveryStatus === 'sending' &&
                        message.content === (serverMessage.content ?? ''),
                    );

                    if (pendingMessageIndex < 0) {
                      return [
                        ...current,
                        createSecureChatMessage(
                          'outgoing',
                          serverMessage.content ?? '',
                          {
                            deliveryStatus: 'delivered',
                            senderName: serverMessage.nickname ?? '我',
                            time: serverMessage.time,
                          },
                        ),
                      ].slice(-80);
                    }

                    return current.map((message, index) =>
                      index === pendingMessageIndex
                        ? {
                            ...message,
                            deliveryStatus: 'delivered' as const,
                            senderName:
                              serverMessage.nickname ?? message.senderName,
                            time: serverMessage.time ?? message.time,
                          }
                        : message,
                    );
                  });
                } else {
                  appendMessage(
                    createSecureChatMessage(
                      'incoming',
                      serverMessage.content ?? '',
                      {
                        senderName:
                          serverMessage.nickname ??
                          serverMessage.user_id ??
                          '聊天室成员',
                        time: serverMessage.time,
                      },
                    ),
                  );
                }
                break;
              case 'error':
                setErrorMessage(serverMessage.message ?? '聊天室消息异常');
                appendSystemMessage(serverMessage.message ?? '聊天室消息异常。');
                break;
            }
          } catch (error) {
            const nextErrorMessage =
              error instanceof Error ? error.message : '聊天室消息解析失败';

            setErrorMessage(nextErrorMessage);
            appendSystemMessage(nextErrorMessage);
          }
        },
        onOpen: () => {
          setStatus('authenticating');
          appendSystemMessage('连接已建立，正在进行 JWT 认证。');
          api.sendAuth(token);
        },
      });
    },
    [
      appendMessage,
      appendSystemMessage,
      endpointLabel,
      host,
      port,
      startHeartbeatTimer,
      stopHeartbeatTimer,
    ],
  );

  const handleSendCode = useCallback(async () => {
    if (!phone.trim()) {
      setErrorMessage('请输入手机号。');
      setActiveTab('me');
      return;
    }

    setIsSendingCode(true);
    setErrorMessage(undefined);
    setStatusMessage(undefined);

    try {
      const result = await createAuthApi().sendSms(phone.trim());

      setCode(result.code);
      setCountdownSeconds(SMS_COUNTDOWN_SECONDS);
      setStatusMessage(`验证码已返回并填入：${result.code}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '验证码发送失败');
    } finally {
      setIsSendingCode(false);
    }
  }, [createAuthApi, phone]);

  const handleLogin = useCallback(async () => {
    if (!phone.trim()) {
      setErrorMessage('请输入手机号。');
      setActiveTab('me');
      return;
    }

    if (!code.trim()) {
      setErrorMessage('请输入验证码。');
      setActiveTab('me');
      return;
    }

    setIsLoggingIn(true);
    setErrorMessage(undefined);
    setStatusMessage(undefined);

    try {
      const api = createAuthApi();
      const session = await api.login(phone.trim(), code.trim());
      const nextProfile = await api.fetchProfile();

      setProfile(nextProfile);
      currentUserIdRef.current = nextProfile.userId;
      setAuthToken(session.token);
      setActiveTab('chat');
      setStatusMessage('HTTP 登录成功，开始连接认证聊天室。');
      appendSystemMessage('HTTP 登录成功，准备建立认证 WebSocket。');
      connectChatRoom(session.token);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '登录失败');
      setActiveTab('me');
    } finally {
      setIsLoggingIn(false);
    }
  }, [appendSystemMessage, code, connectChatRoom, createAuthApi, phone]);

  const handleReconnect = useCallback(() => {
    if (!authToken) {
      setActiveTab('me');
      setErrorMessage('请先登录。');
      return;
    }

    connectChatRoom(authToken);
  }, [authToken, connectChatRoom]);

  const handleSendMessage = useCallback(() => {
    const content = draft.trim();

    if (!content) {
      return;
    }

    const chatApi = chatApiRef.current;
    if (!chatApi) {
      setErrorMessage('聊天室连接不存在，请重新连接。');
      return;
    }

    const localMessage = createSecureChatMessage('outgoing', content, {
      deliveryStatus: 'sending',
      senderName: profile?.nickname ?? '我',
    });
    appendMessage(localMessage);
    setDraft('');

    try {
      chatApi.sendChat(content);
    } catch (error) {
      updateMessage(localMessage.id, message => ({
        ...message,
        deliveryStatus: 'failed',
      }));
      setErrorMessage(error instanceof Error ? error.message : '消息发送失败');
    }
  }, [appendMessage, draft, profile?.nickname, updateMessage]);

  const handleLogout = useCallback(() => {
    stopHeartbeatTimer();
    chatApiRef.current?.close();
    createAuthApi().logout();
    clearAuthToken();
    setAuthToken(undefined);
    currentUserIdRef.current = undefined;
    setProfile(undefined);
    setCode('');
    setDraft('');
    setLastHeartbeatAt(undefined);
    setStatus('disconnected');
    setStatusMessage('已退出登录，JWT 和 WebSocket 连接已清理。');
    setErrorMessage(undefined);
    setActiveTab('me');
    setMessages([createSecureChatMessage('system', '已退出认证聊天室。')]);
  }, [createAuthApi, stopHeartbeatTimer]);

  useEffect(() => {
    if (countdownSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCountdownSeconds(current => Math.max(current - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownSeconds]);

  useEffect(() => {
    return () => {
      stopHeartbeatTimer();
      chatApiRef.current?.close();
    };
  }, [stopHeartbeatTimer]);

  return (
    <SecureChatScreen
      activeTab={activeTab}
      code={code}
      countdownSeconds={countdownSeconds}
      draft={draft}
      endpointLabel={`${endpointLabel} · ${authEndpointLabel}`}
      errorMessage={errorMessage}
      host={host}
      isLoggingIn={isLoggingIn}
      isSendingCode={isSendingCode}
      lastHeartbeatAt={lastHeartbeatAt}
      messages={messages}
      phone={phone}
      port={port}
      profile={profile}
      status={status}
      statusMessage={statusMessage}
      tokenPreview={tokenPreview}
      onBack={onBack}
      onCodeChange={setCode}
      onDraftChange={setDraft}
      onHostChange={setHost}
      onLogin={handleLogin}
      onLogout={handleLogout}
      onPhoneChange={setPhone}
      onPortChange={setPort}
      onReconnect={handleReconnect}
      onSendCode={handleSendCode}
      onSendMessage={handleSendMessage}
      onTabChange={setActiveTab}
    />
  );
}

export default SecureChatPlayground;
