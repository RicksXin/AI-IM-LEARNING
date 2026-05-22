import Conversation, { ConversationJson } from '../entities/Conversation';
import type { ConversationApiConfig } from '../config/conversationApiConfig';
import { createConversationHttpClient } from '../request/createConversationHttpClient';

export type ConversationHttpClient = {
  get<T = unknown>(url: string): Promise<{ data: T }>;
};

export type ConversationApiOptions = {
  client?: ConversationHttpClient;
  config?: ConversationApiConfig;
};

class ConversationApi {
  private readonly client: ConversationHttpClient;

  constructor(options: ConversationApiOptions = {}) {
    this.client =
      options.client ?? createConversationHttpClient(options.config ?? {});
  }

  async fetchConversations() {
    const response = await this.client.get<ConversationJson[]>('/conversation');

    return Conversation.listFromJson(response.data);
  }
}

export default ConversationApi;
