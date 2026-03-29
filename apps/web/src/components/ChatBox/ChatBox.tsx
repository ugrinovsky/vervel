import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { chatApi } from '@/api/chat';
import type { ChatMessage } from '@/api/trainer';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import AccentButton from '@/components/ui/AccentButton';
import AppInput from '@/components/ui/AppInput';
import { useAuth } from '@/contexts/AuthContext';
import { checkForNewAchievements } from '@/hooks/useAchievementToast';
import { WorkoutPreviewCard, parseWorkoutPreview } from './WorkoutPreviewCard';
import type { WorkoutPreviewData } from './WorkoutPreviewCard';
import { WorkoutDetailSheet } from './WorkoutDetailSheet';

const PAGE_SIZE = 20;

interface ChatBoxProps {
  chatId: number;
  className?: string;
  glass?: boolean;
  topPadding?: number;
}

export default function ChatBox({ chatId, className = '', glass = false, topPadding }: ChatBoxProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [openPreview, setOpenPreview] = useState<WorkoutPreviewData | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomPanelRef = useRef<HTMLDivElement>(null);
  const oldestIdRef = useRef<number | null>(null);
  const newestIdRef = useRef<number | null>(null);
  const prevScrollHeightRef = useRef(0);
  const restoringScrollRef = useRef(false);
  const loadingOlderRef = useRef(false);
  const scrollNeededRef = useRef<ScrollBehavior | null>(null);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(80);

  // Scroll to bottom or restore position — runs after DOM is updated
  useLayoutEffect(() => {
    if (restoringScrollRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTop = container.scrollHeight - prevScrollHeightRef.current;
      restoringScrollRef.current = false;
      return;
    }
    if (!initialLoading && scrollNeededRef.current) {
      const container = scrollContainerRef.current;
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: scrollNeededRef.current });
      }
      scrollNeededRef.current = null;
    }
  }, [messages, initialLoading]);

  // Track bottom panel height for absolute positioning in glass mode
  useEffect(() => {
    const el = bottomPanelRef.current
    if (!el) return
    const obs = new ResizeObserver(() => setBottomPanelHeight(el.offsetHeight))
    obs.observe(el)
    return () => obs.disconnect()
  }, []);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await chatApi.getMessages(chatId, { limit: PAGE_SIZE });
        if (cancelled) return;
        const data = res.data.data;
        setMessages(data);
        setHasOlder(data.length >= PAGE_SIZE);
        if (data.length > 0) {
          oldestIdRef.current = data[0].id;
          newestIdRef.current = data[data.length - 1].id;
        }
        chatApi.markAsRead(chatId).catch(() => {});
        scrollNeededRef.current = 'instant';
      } catch {
        if (!cancelled) toast.error('Ошибка загрузки сообщений');
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  // Load older messages on scroll-up (cursor-based)
  const loadOlderMessages = useCallback(async () => {
    if (loadingOlderRef.current || !hasOlder || oldestIdRef.current === null) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);

    prevScrollHeightRef.current = scrollContainerRef.current?.scrollHeight ?? 0;
    restoringScrollRef.current = true;

    try {
      const res = await chatApi.getMessages(chatId, {
        limit: PAGE_SIZE,
        before_id: oldestIdRef.current,
      });
      const data = res.data.data;
      if (data.length === 0) {
        setHasOlder(false);
        restoringScrollRef.current = false;
      } else {
        oldestIdRef.current = data[0].id;
        setHasOlder(data.length >= PAGE_SIZE);
        setMessages((prev) => [...data, ...prev]);
      }
    } catch {
      restoringScrollRef.current = false;
      toast.error('Ошибка загрузки сообщений');
    } finally {
      setLoadingOlder(false);
      loadingOlderRef.current = false;
    }
  }, [chatId, hasOlder]);

  // IntersectionObserver on top sentinel to auto-load older messages
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel || initialLoading) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadOlderMessages();
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [initialLoading, loadOlderMessages]);

  // Real-time messages via SSE
  useEffect(() => {
    if (initialLoading) return;

    const apiBase = import.meta.env.VITE_API_URL || '';
    const afterId = newestIdRef.current ?? 0;
    const url = `${apiBase}/chats/${chatId}/stream?after_id=${afterId}`;
    const source = new EventSource(url, { withCredentials: true });

    source.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as { type: string; data: ChatMessage };
        if (msg.type !== 'message') return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.data.id)) return prev;
          newestIdRef.current = msg.data.id;
          return [...prev, msg.data];
        });
        chatApi.markAsRead(chatId).catch(() => {});
        scrollNeededRef.current = 'smooth';
      } catch { /* ignore */ }
    };

    return () => source.close();
  }, [chatId, initialLoading]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);
    try {
      const res = await chatApi.sendMessage(chatId, content);
      const msg = res.data.data;
      scrollNeededRef.current = 'smooth';
      setMessages((prev) => [...prev, msg]);
      newestIdRef.current = msg.id;
      checkForNewAchievements();
    } catch {
      toast.error('Ошибка отправки сообщения');
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 72) + 'px';
  };

  // Reset textarea height after send
  useEffect(() => {
    if (!newMessage && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [newMessage]);

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  if (initialLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`} style={glass ? { paddingTop: (topPadding ?? 0) + 32 } : undefined}>
        <div className="w-6 h-6 border-2 border-white/20 border-t-(--color_primary_light) rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={glass ? `relative h-full ${className}` : `flex flex-col h-full ${className}`}>
      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className={glass ? 'absolute inset-0 overflow-y-auto px-4 space-y-3' : 'flex-1 min-h-0 overflow-y-auto p-4 space-y-3'}
        style={glass ? { paddingTop: (topPadding ?? 0) + 16, paddingBottom: bottomPanelHeight + 16 } : undefined}
      >
        <div ref={topSentinelRef} className="h-px" />

        {loadingOlder && (
          <div className="flex justify-center py-2">
            <div className="w-5 h-5 border-2 border-white/20 border-t-(--color_primary_light) rounded-full animate-spin" />
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-sm text-(--color_text_muted)">Пока нет сообщений. Начните беседу!</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message, index) => {
              const isCurrentUser = message.senderId === user?.id;
              const showSender = index === 0 || messages[index - 1].senderId !== message.senderId;
              const preview = parseWorkoutPreview(message.content);

              if (preview) {
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                  >
                    {showSender && (
                      <div className="text-xs text-(--color_text_muted) mb-1.5 px-1">
                        {message.sender.fullName || 'Тренер'}
                      </div>
                    )}
                    <WorkoutPreviewCard data={preview} onClick={() => setOpenPreview(preview)} />
                    <div className="text-xs text-(--color_text_muted) mt-1 px-1">
                      {formatTime(message.createdAt)}
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-white ${
                      isCurrentUser
                        ? glass
                          ? ''
                          : 'bg-(--color_primary_light)'
                        : glass
                          ? 'bg-white/10 backdrop-blur-sm border border-white/10'
                          : 'bg-(--color_bg_card_hover)'
                    }`}
                    style={
                      isCurrentUser && glass
                        ? { background: 'rgb(var(--color_primary_light_ch) / 0.35)' }
                        : undefined
                    }
                  >
                    {showSender && !isCurrentUser && (
                      <div className="text-xs text-(--color_text_muted) mb-1">
                        {message.sender.fullName || 'Без имени'}
                      </div>
                    )}
                    <div className="text-sm wrap-break-word whitespace-pre-wrap">{message.content}</div>
                    <div
                      className={`text-xs mt-1 ${isCurrentUser ? 'text-white/70' : 'text-(--color_text_muted)'}`}
                    >
                      {formatTime(message.createdAt)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {glass ? (
        <div
          ref={bottomPanelRef}
          className="absolute bottom-0 left-0 right-0 z-10 flex items-center gap-2 px-3"
          style={{
            background: 'var(--chat_panel_bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid var(--color_border)',
            paddingTop: '10px',
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 10px)',
          }}
        >
          <div className="flex-1 flex items-center bg-white/8 rounded-2xl px-3 py-2.5 border border-white/10">
            <textarea
              ref={textareaRef}
              rows={1}
              value={newMessage}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Написать сообщение..."
              disabled={sending}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/35 border-none focus:outline-none resize-none leading-5"
              style={{ outline: 'none', maxHeight: '72px', overflowY: 'auto' }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 disabled:cursor-not-allowed ${
              newMessage.trim()
                ? 'bg-(--color_primary_light) opacity-100'
                : 'bg-white/10 opacity-50'
            }`}
          >
            <PaperAirplaneIcon className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        <div className="p-4 border-t border-(--color_border)">
          <div className="flex gap-2">
            <AppInput
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Написать сообщение..."
              disabled={sending}
              className="py-2 disabled:opacity-50"
            />
            <AccentButton
              size="sm"
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="px-4 py-2 rounded-xl disabled:cursor-not-allowed"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </AccentButton>
          </div>
        </div>
      )}

      <WorkoutDetailSheet
        data={openPreview}
        open={!!openPreview}
        onClose={() => setOpenPreview(null)}
      />
    </div>
  );
}
