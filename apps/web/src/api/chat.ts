import { privateApi } from './http/privateApi';
import type { ChatMessage } from './trainer';

export interface DialogLastMessage {
  id: number
  content: string
  senderId: number
  senderName: string
  isOwnMessage: boolean
  sentAt: string
}

export interface DialogItem {
  chatId: number
  type: 'personal' | 'group'
  name: string
  avatarUrl: string | null
  avatarInitials: string
  memberCount?: number
  topicCount?: number
  trainerId: number
  athleteId: number | null
  groupId: number | null
  nickname?: string | null
  lastMessage: DialogLastMessage | null
  unreadCount: number
}

/** Shared chat API — accessible to both trainers and athletes */
export const chatApi = {
  listDialogs: () =>
    privateApi.get<{ success: boolean; data: DialogItem[] }>('/chats'),


  getMessages: (
    chatId: number,
    options?: { limit?: number; before_id?: number }
  ) =>
    privateApi.get<{ success: boolean; data: ChatMessage[] }>(`/chats/${chatId}/messages`, {
      params: options,
    }),

  sendMessage: (chatId: number, content: string) =>
    privateApi.post<{ success: boolean; data: ChatMessage }>(`/chats/${chatId}/messages`, {
      content,
    }),

  markAsRead: (chatId: number) =>
    privateApi.post<{ success: boolean }>(`/chats/${chatId}/read`),
};
