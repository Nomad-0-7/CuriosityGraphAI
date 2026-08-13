import { fetchApi } from './client';
import type { ChatResponse, Message } from '../types';

export const sendChatMessage = (documentId: string, question: string, threadId?: string) => {
  return fetchApi<ChatResponse>(`/api/chat/${documentId}`, {
    method: 'POST',
    body: JSON.stringify({ question, thread_id: threadId }),
  });
};

export const getThreadMessages = (threadId: string) => {
  return fetchApi<Message[]>(`/api/chat/threads/${threadId}/messages`);
};