import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  createHeartbeatLogEntry,
  createHeartbeatWebSocketURL,
  defaultHeartbeatApiConfig,
  HeartbeatApi,
} from '../heartbeat';
import { getDefaultPlaygroundHost } from '../config/playgroundNetwork';
import type {
  HeartbeatConnectionStatus,
  HeartbeatLogEntry,
  HeartbeatLogType,
} from '../heartbeat';
import HeartbeatScreen from '../heartbeat/view/HeartbeatScreen';

type HeartbeatPlaygroundProps = {
  onBack: () => void;
};

const HEARTBEAT_INTERVAL_MS = 5000;
const HEARTBEAT_MESSAGE = 'ping';

function HeartbeatPlayground({ onBack }: HeartbeatPlaygroundProps) {
  const [host, setHost] = useState(getDefaultPlaygroundHost());
  const [port, setPort] = useState(String(defaultHeartbeatApiConfig.port));
  const [status, setStatus] =
    useState<HeartbeatConnectionStatus>('disconnected');
  const [logs, setLogs] = useState<HeartbeatLogEntry[]>([
    createHeartbeatLogEntry('info', '启动后端并点击连接，服务端会先发欢迎消息。'),
  ]);
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<string | undefined>();
  const apiRef = useRef<HeartbeatApi | undefined>(undefined);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );

  const endpointLabel = useMemo(() => {
    try {
      return createHeartbeatWebSocketURL({ host, port });
    } catch {
      return '请输入 WebSocket 地址';
    }
  }, [host, port]);

  const appendLog = useCallback(
    (type: HeartbeatLogType, message: string) => {
      setLogs(current => [
        createHeartbeatLogEntry(type, message),
        ...current,
      ].slice(0, 80));
    },
    [],
  );

  const stopHeartbeatTimer = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = undefined;
    }
  }, []);

  const sendHeartbeat = useCallback(
    (source: 'manual' | 'auto' = 'manual') => {
      try {
        apiRef.current?.send(HEARTBEAT_MESSAGE);
        const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        setLastHeartbeatAt(time);
        appendLog(
          'send',
          source === 'auto'
            ? `${HEARTBEAT_MESSAGE}（自动心跳）`
            : `${HEARTBEAT_MESSAGE}（手动心跳）`,
        );
      } catch (error) {
        appendLog(
          'error',
          error instanceof Error ? error.message : '心跳发送失败',
        );
      }
    },
    [appendLog],
  );

  const startHeartbeatTimer = useCallback(() => {
    stopHeartbeatTimer();
    heartbeatTimerRef.current = setInterval(() => {
      sendHeartbeat('auto');
    }, HEARTBEAT_INTERVAL_MS);
  }, [sendHeartbeat, stopHeartbeatTimer]);

  const handleConnect = useCallback(() => {
    stopHeartbeatTimer();
    apiRef.current?.close();

    setStatus('connecting');
    setLastHeartbeatAt(undefined);
    appendLog('connect', endpointLabel);

    const api = new HeartbeatApi({ host, port });
    apiRef.current = api;
    api.connect({
      onOpen: () => {
        setStatus('connected');
        appendLog('open', '连接建立，开始自动心跳。');
        startHeartbeatTimer();
      },
      onMessage: message => {
        appendLog('receive', message);
      },
      onClose: event => {
        stopHeartbeatTimer();
        setStatus('disconnected');
        appendLog('close', `code=${event?.code ?? '-'} 连接已断开`);
      },
      onError: () => {
        stopHeartbeatTimer();
        setStatus('error');
        appendLog('error', 'WebSocket 连接异常，请确认后端是否运行。');
      },
    });
  }, [appendLog, endpointLabel, host, port, startHeartbeatTimer, stopHeartbeatTimer]);

  const handleDisconnect = useCallback(() => {
    stopHeartbeatTimer();
    appendLog('close', '主动断开连接。');
    apiRef.current?.close();
  }, [appendLog, stopHeartbeatTimer]);

  useEffect(() => {
    return () => {
      stopHeartbeatTimer();
      apiRef.current?.close();
    };
  }, [stopHeartbeatTimer]);

  return (
    <HeartbeatScreen
      endpointLabel={endpointLabel}
      heartbeatIntervalSeconds={HEARTBEAT_INTERVAL_MS / 1000}
      host={host}
      lastHeartbeatAt={lastHeartbeatAt}
      logs={logs}
      port={port}
      status={status}
      onBack={onBack}
      onClearLogs={() => setLogs([])}
      onConnect={handleConnect}
      onDisconnect={handleDisconnect}
      onHostChange={setHost}
      onPortChange={setPort}
      onSendHeartbeat={() => sendHeartbeat('manual')}
    />
  );
}

export default HeartbeatPlayground;
