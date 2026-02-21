import { privateApi } from './http/privateApi';
import type { ChatMessage } from './trainer';

/** Shared chat API — accessible to both trainers and athletes */
export const chatApi = {
  getMessages: (chatId: number) =>
    privateApi.get<{ success: boolean; data: ChatMessage[] }>(`/chats/${chatId}/messages`),

  sendMessage: (chatId: number, content: string) =>
    privateApi.post<{ success: boolean; data: ChatMessage }>(`/chats/${chatId}/messages`, {
      content,
    }),

  markAsRead: (chatId: number) =>
    privateApi.post<{ success: boolean }>(`/chats/${chatId}/read`),
};
