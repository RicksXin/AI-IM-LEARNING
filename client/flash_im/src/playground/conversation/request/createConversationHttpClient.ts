import axios from 'axios';
import type { AxiosInstance } from 'axios';
import {
  ConversationApiConfig,
  createConversationBaseURL,
  defaultConversationApiConfig,
} from '../config/conversationApiConfig';

export function createConversationHttpClient(
  config: ConversationApiConfig = {},
): AxiosInstance {
  return axios.create({
    baseURL: createConversationBaseURL(config),
    timeout: config.timeoutMs ?? defaultConversationApiConfig.timeoutMs,
    headers: {
      Accept: 'application/json',
    },
  });
}
