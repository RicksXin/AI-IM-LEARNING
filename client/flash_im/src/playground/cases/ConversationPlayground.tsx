import React, { useCallback, useMemo, useState } from 'react';
import {
  ConversationApi,
  createConversationBaseURL,
  defaultConversationApiConfig,
} from '../conversation';
import { previewConversations } from '../conversation/data/previewConversations';
import type Conversation from '../conversation/entities/Conversation';
import ConversationScreen from '../conversation/view/ConversationScreen';

type ConversationPlaygroundProps = {
  onBack: () => void;
};

function ConversationPlayground({ onBack }: ConversationPlaygroundProps) {
  const [host, setHost] = useState(defaultConversationApiConfig.host);
  const [port, setPort] = useState(String(defaultConversationApiConfig.port));
  const [conversations, setConversations] =
    useState<Conversation[]>(previewConversations);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const endpointLabel = useMemo(() => {
    try {
      return `${createConversationBaseURL({ host, port })}/conversation`;
    } catch {
      return '请输入后端地址';
    }
  }, [host, port]);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(undefined);

    try {
      const api = new ConversationApi({
        config: {
          host,
          port,
        },
      });
      const nextConversations = await api.fetchConversations();

      setConversations(nextConversations);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '会话列表请求失败',
      );
    } finally {
      setIsLoading(false);
    }
  }, [host, port]);

  return (
    <ConversationScreen
      conversations={conversations}
      endpointLabel={endpointLabel}
      errorMessage={errorMessage}
      host={host}
      isLoading={isLoading}
      port={port}
      onBack={onBack}
      onHostChange={setHost}
      onPortChange={setPort}
      onRefresh={handleRefresh}
    />
  );
}

export default ConversationPlayground;
