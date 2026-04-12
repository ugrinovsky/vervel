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

export type GiphyKind = 'gif' | 'sticker'

export interface GiphySearchItem {
  id: string
  previewUrl: string
  url: string
  /** Из ответа GIPHY для превью-рендира */
  previewWidth?: number
  previewHeight?: number
}

export interface GiphySearchResponse {
  items: GiphySearchItem[]
  nextOffset: number | null
}

export interface GiphyCategory {
  name: string
  name_encoded: string
  defaultTagEncoded: string | null
  categoryPreviewUrl: string | null
}

/** Shared chat API — accessible to both trainers and athletes */
export const chatApi = {
  listDialogs: () =>
    privateApi.get<{ success: boolean; data: DialogItem[] }>('/chats'),

  giphyStatus: () =>
    privateApi.get<{ success: boolean; data: { enabled: boolean } }>('/chats/giphy/status'),

  listGiphyCategories: (params?: { kind?: GiphyKind }) =>
    privateApi.get<{ success: boolean; data: { categories: GiphyCategory[] } }>(
      '/chats/giphy/categories',
      { params }
    ),

  searchGiphy: (params: {
    q?: string
    offset?: number
    limit?: number
    kind?: GiphyKind
    category?: string
    tag?: string
  }) =>
    privateApi.get<{ success: boolean; data: GiphySearchResponse }>('/chats/giphy/search', {
      params,
    }),


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
