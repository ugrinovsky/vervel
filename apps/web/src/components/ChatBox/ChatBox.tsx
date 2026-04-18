import {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
  type SyntheticEvent,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { chatApi } from '@/api/chat';
import type { ChatMessage } from '@/api/trainer';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import AccentButton from '@/components/ui/AccentButton';
import AppInput from '@/components/ui/AppInput';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { checkForNewAchievements } from '@/hooks/useAchievementToast';
import { refreshDialogs } from '@/hooks/useDialogs';
import { useVisualViewportBottomInset } from '@/hooks/useVisualViewportBottomInset';
import { WorkoutPreviewCard, parseWorkoutPreview } from './WorkoutPreviewCard';
import type { WorkoutPreviewData } from './WorkoutPreviewCard';
import KlipyPicker from './KlipyPicker';
import WorkoutDetailSheet from '@/screens/ActivityScreen/WorkoutDetailSheet';
import type { WorkoutTimelineEntry } from '@/types/Analytics';
import { workoutsApi } from '@/api/workouts';
import { formatKlipyMessageContent, parseKlipyMessage } from '@/util/klipyMessage';

const PAGE_SIZE = 20;

/**
 * Сообщение: `klipy:url` или `klipy:WxH:url`.
 * Слот по WxH до загрузки; после onLoad — если подсказка квадратная или сильно не совпадает с файлом,
 * берём natural* (у провайдера в метаданных часто 450×450 при другом кадре).
 */
function ChatKlipyAttachment({
  src,
  previewWidth,
  previewHeight,
}: {
  src: string;
  previewWidth?: number;
  previewHeight?: number;
}) {
  const [loaded, setLoaded] = useState(false);
  const hasHint =
    typeof previewWidth === 'number' &&
    typeof previewHeight === 'number' &&
    previewWidth > 0 &&
    previewHeight > 0;
  const iw = hasHint ? Math.round(previewWidth) : null;
  const ih = hasHint ? Math.round(previewHeight) : null;

  const [aspect, setAspect] = useState<string>(() => {
    if (iw !== null && ih !== null) return `${iw} / ${ih}`;
    return '1 / 1';
  });

  useEffect(() => {
    setLoaded(false);
    if (iw !== null && ih !== null) setAspect(`${iw} / ${ih}`);
    else setAspect('1 / 1');
  }, [src, iw, ih]);

  const handleImgLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: nw, naturalHeight: nh } = e.currentTarget;
    if (nw > 0 && nh > 0) {
      if (iw !== null && ih !== null) {
        const hintR = iw / ih;
        const natR = nw / nh;
        if (iw === ih || Math.abs(hintR - natR) > 0.05) {
          setAspect(`${nw} / ${nh}`);
        }
      } else {
        setAspect(`${nw} / ${nh}`);
      }
    }
    setLoaded(true);
  };

  return (
    <div
      className="relative mx-auto w-full max-w-[min(100%,20rem)] min-w-[10rem] rounded-xl overflow-hidden bg-white/[0.08] shrink-0"
      style={{ aspectRatio: aspect }}
    >
      {!loaded && (
        <div className="absolute inset-0 z-[1] animate-pulse bg-white/[0.06] flex items-center justify-center pointer-events-none">
          <span className="text-[11px] font-semibold tracking-wide text-white/25">GIF</span>
        </div>
      )}
      <img
        src={src}
        alt=""
        width={iw ?? undefined}
        height={ih ?? undefined}
        loading="lazy"
        decoding="async"
        onLoad={handleImgLoad}
        className={`absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-200 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}

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
  const [klipyOpen, setKlipyOpen] = useState(false);
  const [klipyEnabled, setKlipyEnabled] = useState(false);
  const [openWorkout, setOpenWorkout] = useState<WorkoutTimelineEntry | null>(null);

  const handlePreviewClick = async (preview: WorkoutPreviewData) => {
    if (!preview.scheduledWorkoutId) return;
    try {
      const res = await workoutsApi.getByScheduledId(preview.scheduledWorkoutId);
      const w = res.data;
      setOpenWorkout({
        id: w.id,
        date: w.date ?? preview.date,
        type: w.workoutType ?? preview.workoutType,
        scheduledWorkoutId: preview.scheduledWorkoutId,
      });
    } catch {
      // workout not yet created for this athlete (future workout) — show nothing
    }
  };

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
  const stickToBottomRef = useRef(true);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(80);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const root = scrollContainerRef.current;
    if (!root) return;
    root.scrollTo({ top: root.scrollHeight, behavior });
  }, []);

  const onMessagesScroll = useCallback(() => {
    const root = scrollContainerRef.current;
    if (!root) return;
    const dist = root.scrollHeight - root.scrollTop - root.clientHeight;
    stickToBottomRef.current = dist < 100;
  }, []);

  const { bottomInset: keyboardBottomInset, remeasureForKeyboardFocus } =
    useVisualViewportBottomInset(glass);

  // Scroll to bottom or restore position — runs after DOM is updated
  useLayoutEffect(() => {
    if (restoringScrollRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTop = container.scrollHeight - prevScrollHeightRef.current;
      restoringScrollRef.current = false;
      return;
    }
    if (!initialLoading && scrollNeededRef.current) {
      const behavior = scrollNeededRef.current === 'smooth' ? 'smooth' : 'auto';
      scrollToBottom(behavior);
      scrollNeededRef.current = null;
      stickToBottomRef.current = true;
    }
  }, [messages, initialLoading, scrollToBottom]);

  // Track bottom panel height for absolute positioning in glass mode
  useEffect(() => {
    const el = bottomPanelRef.current
    if (!el) return
    const obs = new ResizeObserver(() => setBottomPanelHeight(el.offsetHeight))
    obs.observe(el)
    return () => obs.disconnect()
  }, []);

  useEffect(() => {
    let cancelled = false;
    chatApi
      .klipyStatus()
      .then((r) => {
        if (!cancelled) setKlipyEnabled(r.data.data.enabled);
      })
      .catch(() => {
        if (!cancelled) setKlipyEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  // Initial load (при смене чата — скелетон и сброс, без «чужих» сообщений)
  useEffect(() => {
    let cancelled = false;
    setInitialLoading(true);
    setMessages([]);
    setHasOlder(false);
    oldestIdRef.current = null;
    newestIdRef.current = null;
    stickToBottomRef.current = true;

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
        chatApi.markAsRead(chatId).then(() => refreshDialogs()).catch(() => {});
        scrollNeededRef.current = 'auto';
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
        chatApi.markAsRead(chatId).then(() => refreshDialogs()).catch(() => {});
        stickToBottomRef.current = true;
        scrollNeededRef.current = 'smooth';
      } catch { /* ignore */ }
    };

    source.onerror = () => {
      // EventSource reconnects automatically — close only if response is not 2xx
      // (e.g. 401 auth expired). readyState 2 = CLOSED by browser after fatal error.
      if (source.readyState === EventSource.CLOSED) {
        toast.error('Соединение с чатом прервано. Обновите страницу.');
      }
    };

    return () => source.close();
  }, [chatId, initialLoading]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    const content = newMessage.trim();
    setNewMessage('');
    stickToBottomRef.current = true;
    setSending(true);
    try {
      await chatApi.sendMessage(chatId, content);
      refreshDialogs();
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
      <div
        className={`flex flex-col h-full min-h-0 w-full ${className}`}
        style={glass ? { paddingTop: (topPadding ?? 0) + 16 } : undefined}
      >
        <div
          className={`flex-1 min-h-0 overflow-hidden space-y-3 ${glass ? 'px-4' : 'p-4'}`}
          aria-busy
          aria-label="Загрузка сообщений"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`rounded-2xl animate-pulse bg-white/[0.08] ${
                  i === 2 ? 'aspect-square w-[min(100%,13rem)]' : 'h-11 w-[min(72%,240px)]'
                }`}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        glass ? `relative h-full min-h-0 ${className}` : `relative flex flex-col h-full min-h-0 ${className}`
      }
    >
      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={onMessagesScroll}
        className={glass ? 'absolute inset-0 overflow-y-auto px-4 space-y-3' : 'flex-1 min-h-0 overflow-y-auto p-4 space-y-3'}
        style={
          glass
            ? {
                paddingTop: (topPadding ?? 0) + 16,
                paddingBottom: bottomPanelHeight + 16 + keyboardBottomInset,
              }
            : undefined
        }
      >
        <div ref={topSentinelRef} className="h-px" />

        {loadingOlder && (
          <div className="flex justify-center py-2">
            <LoadingSpinner size="sm" />
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
              const klipy = parseKlipyMessage(message.content);

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
                    <WorkoutPreviewCard
                      data={preview}
                      onClick={preview.scheduledWorkoutId ? () => handlePreviewClick(preview) : undefined}
                    />
                    <div className="text-xs text-(--color_text_muted) mt-1 px-1">
                      {formatTime(message.createdAt)}
                    </div>
                  </motion.div>
                );
              }

              if (klipy) {
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex w-full min-w-0 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`inline-flex max-w-[75%] flex-col rounded-2xl overflow-hidden text-white ${
                        isCurrentUser
                          ? glass
                            ? 'backdrop-blur-sm border border-white/22 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.08)]'
                            : 'bg-(--color_primary_light)'
                          : glass
                            ? 'bg-white/[0.06] backdrop-blur-sm border border-white/20 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.06)]'
                            : 'bg-(--color_bg_card_hover)'
                      }`}
                      style={
                        isCurrentUser && glass
                          ? { background: 'rgb(var(--color_primary_light_ch) / 0.14)' }
                          : undefined
                      }
                    >
                      {showSender && !isCurrentUser && (
                        <div className="text-xs text-(--color_text_muted) px-3 pt-2 pb-1">
                          {message.sender.fullName || 'Без имени'}
                        </div>
                      )}
                      <a
                        href={klipy.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full min-w-0 p-1"
                      >
                        <ChatKlipyAttachment
                          src={klipy.url}
                          previewWidth={klipy.previewWidth}
                          previewHeight={klipy.previewHeight}
                        />
                      </a>
                      <div
                        className={`text-xs px-3 pb-2 pt-0.5 ${isCurrentUser ? 'text-white/70' : 'text-(--color_text_muted)'}`}
                      >
                        {formatTime(message.createdAt)}
                      </div>
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
                          ? 'backdrop-blur-sm border border-white/22 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.08)]'
                          : 'bg-(--color_primary_light)'
                        : glass
                          ? 'bg-white/[0.06] backdrop-blur-sm border border-white/20 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.06)]'
                          : 'bg-(--color_bg_card_hover)'
                    }`}
                    style={
                      isCurrentUser && glass
                        ? { background: 'rgb(var(--color_primary_light_ch) / 0.14)' }
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
          className="absolute left-0 right-0 z-10 flex items-center gap-2 px-3"
          style={{
            bottom: keyboardBottomInset,
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
              onFocus={remeasureForKeyboardFocus}
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
          {klipyEnabled && (
            <button
              type="button"
              onClick={() => setKlipyOpen(true)}
              disabled={sending}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-white/10 border border-white/15 text-[10px] font-bold tracking-wide text-white/90 disabled:opacity-40"
              title="GIF"
            >
              GIF
            </button>
          )}
        </div>
      ) : (
        <div className="p-4 border-t border-(--color_border)">
          <div className="flex gap-2 items-center">
            <AppInput
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Написать сообщение..."
              disabled={sending}
              className="py-2 flex-1 min-w-0 disabled:opacity-50"
            />
            <AccentButton
              size="sm"
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="px-4 py-2 rounded-xl disabled:cursor-not-allowed"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </AccentButton>
            {klipyEnabled && (
              <button
                type="button"
                onClick={() => setKlipyOpen(true)}
                disabled={sending}
                className="h-10 px-2.5 rounded-xl shrink-0 text-[10px] font-bold tracking-wide border border-(--color_border) bg-(--color_bg_card_hover) text-(--color_text_secondary) hover:bg-(--color_bg_card) disabled:opacity-40"
                title="GIF"
              >
                GIF
              </button>
            )}
          </div>
        </div>
      )}

      <WorkoutDetailSheet
        workout={openWorkout}
        onClose={() => setOpenWorkout(null)}
      />

      {klipyEnabled && (
        <KlipyPicker
          open={klipyOpen}
          onClose={() => setKlipyOpen(false)}
          pickDisabled={sending}
          onPick={async (item) => {
            setSending(true);
            try {
              await chatApi.sendMessage(
                chatId,
                formatKlipyMessageContent(item.url, item.previewWidth, item.previewHeight)
              );
              refreshDialogs();
              checkForNewAchievements();
            } finally {
              setSending(false);
            }
          }}
        />
      )}
    </div>
  );
}
