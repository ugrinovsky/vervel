import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { chatApi } from '@/api/chat';
import type { ChatMessage, ExerciseData } from '@/api/trainer';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { WORKOUT_TYPE_CONFIG } from '@/constants/workoutTypes';
import { checkForNewAchievements } from '@/hooks/useAchievementToast';

const PAGE_SIZE = 20;

interface WorkoutPreviewData {
  __type: 'workout_preview';
  date: string;
  time: string;
  workoutType: 'crossfit' | 'bodybuilding' | 'cardio';
  exercises: ExerciseData[];
  notes?: string;
}

function parseWorkoutPreview(content: string): WorkoutPreviewData | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed.__type === 'workout_preview') return parsed as WorkoutPreviewData;
    return null;
  } catch {
    return null;
  }
}

function WorkoutPreviewCard({ data, onClick }: { data: WorkoutPreviewData; onClick?: () => void }) {
  const [y, m, d] = data.date.split('-').map(Number);
  const dateStr = format(new Date(y, m - 1, d), 'd MMMM', { locale: ru });
  const typeLabel = WORKOUT_TYPE_CONFIG[data.workoutType] ?? data.workoutType;

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm w-full ${onClick ? 'cursor-pointer hover:bg-white/10 transition-colors active:scale-[0.99]' : ''}`}
    >
      <div className="px-4 py-3 bg-white/5 border-b border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Тренировка</span>
          <span className="text-xs font-medium text-white/60">{typeLabel}</span>
        </div>
        <div className="text-xs text-white/50 mt-0.5">
          📅 {dateStr} · {data.time}
        </div>
      </div>

      {data.exercises.length > 0 && (
        <div className="px-4 py-3 space-y-1.5">
          {data.exercises.map((ex, i) => (
            <div key={i} className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-white/90 truncate">{ex.name}</span>
              <span className="text-xs text-white/40 shrink-0">
                {ex.duration
                  ? `${ex.duration} мин`
                  : [
                      ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : null,
                      ex.weight ? `${ex.weight} кг` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
              </span>
            </div>
          ))}
        </div>
      )}

      {data.notes && (
        <div className="px-4 py-2.5 border-t border-white/10 text-xs text-white/50 italic">
          📝 {data.notes}
        </div>
      )}

      {onClick && (
        <div className="px-4 py-2 border-t border-white/10 text-xs text-white/30 text-center">
          Нажмите для просмотра
        </div>
      )}
    </div>
  );
}

function WorkoutDetailSheet({
  data,
  open,
  onClose,
}: {
  data: WorkoutPreviewData | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!data) return null;
  const [y, m, d] = data.date.split('-').map(Number);
  const dateStr = format(new Date(y, m - 1, d), 'd MMMM yyyy', { locale: ru });
  const typeLabel = WORKOUT_TYPE_CONFIG[data.workoutType] ?? data.workoutType;

  type ExBlock = { superset: boolean; blockId?: string; items: typeof data.exercises };
  const blocks: ExBlock[] = [];
  for (const ex of data.exercises) {
    const last = blocks[blocks.length - 1];
    if (ex.blockId && last && last.blockId === ex.blockId) {
      last.items.push(ex);
    } else {
      blocks.push({ superset: !!ex.blockId, blockId: ex.blockId, items: [ex] });
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      header={
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-lg font-bold text-white">Тренировка</span>
          </div>
          <span className="text-sm font-semibold text-white/60">{typeLabel}</span>
        </div>
      }
    >
      <div className="space-y-4">
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/10"
          style={{ backgroundColor: 'var(--color_bg_card_hover)' }}
        >
          <span className="text-xl">📅</span>
          <div>
            <div className="text-sm font-semibold text-white">{dateStr}</div>
            <div className="text-xs text-white/50">{data.time}</div>
          </div>
        </div>

        {data.exercises.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
              Упражнения ({data.exercises.length})
            </div>
            <div className="space-y-2">
              {blocks.map((block, bi) =>
                block.superset ? (
                  <div key={bi} className="rounded-xl border border-amber-500/30 overflow-hidden">
                    <div
                      className="px-3 py-1 text-[10px] font-semibold text-amber-400 uppercase tracking-wider"
                      style={{ backgroundColor: 'rgba(245,158,11,0.08)' }}
                    >
                      ⚡ Суперсет
                    </div>
                    {block.items.map((ex, i) => (
                      <div
                        key={i}
                        className={`px-3 py-2.5 ${i < block.items.length - 1 ? 'border-b border-amber-500/20' : ''}`}
                        style={{ backgroundColor: 'rgba(245,158,11,0.04)' }}
                      >
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <span className="text-sm font-medium text-white">{ex.name}</span>
                          <span className="text-sm text-white/60 shrink-0">
                            {ex.duration
                              ? `${ex.duration} мин`
                              : [
                                  ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : null,
                                  ex.weight ? `${ex.weight} кг` : null,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                          </span>
                        </div>
                        {ex.notes && (
                          <div className="text-xs text-amber-300/60 italic">{ex.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  block.items.map((ex, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-white/10 overflow-hidden"
                      style={{ backgroundColor: 'var(--color_bg_card_hover)' }}
                    >
                      <div className="flex items-baseline justify-between gap-2 px-3 py-2.5">
                        <span className="text-sm font-medium text-white">{ex.name}</span>
                        <span className="text-sm text-white/60 shrink-0">
                          {ex.duration
                            ? `${ex.duration} мин`
                            : [
                                ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : null,
                                ex.weight ? `${ex.weight} кг` : null,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                        </span>
                      </div>
                      {ex.notes && (
                        <div className="px-3 pb-2.5 text-xs text-white/50 italic border-t border-white/5 pt-1.5">
                          💬 {ex.notes}
                        </div>
                      )}
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        )}

        {data.notes && (
          <div>
            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
              Заметки тренера
            </div>
            <div
              className="px-3 py-2.5 rounded-xl border border-white/10 text-sm text-white/70 italic"
              style={{ backgroundColor: 'var(--color_bg_card_hover)' }}
            >
              📝 {data.notes}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

interface ChatBoxProps {
  chatId: number;
  className?: string;
}

export default function ChatBox({ chatId, className = '' }: ChatBoxProps) {
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
  const oldestIdRef = useRef<number | null>(null);
  const newestIdRef = useRef<number | null>(null);
  const prevScrollHeightRef = useRef(0);
  const restoringScrollRef = useRef(false);
  const loadingOlderRef = useRef(false);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Restore scroll position after prepending older messages
  useLayoutEffect(() => {
    if (restoringScrollRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTop = container.scrollHeight - prevScrollHeightRef.current;
      restoringScrollRef.current = false;
    }
  }, [messages]);

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
        setTimeout(() => scrollToBottom('instant'), 50);
      } catch {
        if (!cancelled) toast.error('Ошибка загрузки сообщений');
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [chatId]);

  // Load older messages on scroll-up (cursor-based)
  const loadOlderMessages = useCallback(async () => {
    if (loadingOlderRef.current || !hasOlder || oldestIdRef.current === null) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);

    // Save scroll height before prepend
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
      ([entry]) => { if (entry.isIntersecting) loadOlderMessages(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [initialLoading, loadOlderMessages]);

  // Poll for new messages every 10s
  useEffect(() => {
    if (initialLoading) return;
    const interval = setInterval(async () => {
      try {
        const res = await chatApi.getMessages(chatId, { limit: PAGE_SIZE });
        const data = res.data.data;
        if (data.length === 0) return;
        const latestId = data[data.length - 1].id;
        if (newestIdRef.current !== null && latestId <= newestIdRef.current) return;

        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newOnes = data.filter((m) => !existingIds.has(m.id));
          if (newOnes.length === 0) return prev;
          newestIdRef.current = newOnes[newOnes.length - 1].id;
          return [...prev, ...newOnes];
        });
        chatApi.markAsRead(chatId).catch(() => {});
        scrollToBottom('smooth');
      } catch {
        // silent
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [chatId, initialLoading]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);
    try {
      const res = await chatApi.sendMessage(chatId, content);
      const msg = res.data.data;
      setMessages((prev) => [...prev, msg]);
      newestIdRef.current = msg.id;
      scrollToBottom('smooth');
      checkForNewAchievements();
    } catch {
      toast.error('Ошибка отправки сообщения');
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  if (initialLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="w-6 h-6 border-2 border-white/20 border-t-(--color_primary_light) rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {/* Top sentinel — triggers loading older messages */}
        <div ref={topSentinelRef} className="h-px" />

        {/* Loading older indicator */}
        {loadingOlder && (
          <div className="flex justify-center py-2">
            <div className="w-5 h-5 border-2 border-white/20 border-t-(--color_primary_light) rounded-full animate-spin" />
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-sm text-(--color_text_muted)">
              Пока нет сообщений. Начните беседу!
            </p>
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
                    className={`max-w-[75%] ${
                      isCurrentUser
                        ? 'bg-(--color_primary_light) text-white'
                        : 'bg-(--color_bg_card_hover) text-white'
                    } rounded-2xl px-4 py-2`}
                  >
                    {showSender && !isCurrentUser && (
                      <div className="text-xs text-(--color_text_muted) mb-1">
                        {message.sender.fullName || 'Без имени'}
                      </div>
                    )}
                    <div className="text-sm break-words">{message.content}</div>
                    <div
                      className={`text-xs mt-1 ${
                        isCurrentUser ? 'text-white/70' : 'text-(--color_text_muted)'
                      }`}
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
      <div className="p-4 border-t border-(--color_border) mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Написать сообщение..."
            disabled={sending}
            className="flex-1 bg-(--color_bg_input) border border-(--color_border) rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 rounded-xl bg-(--color_primary_light) text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <WorkoutDetailSheet
        data={openPreview}
        open={!!openPreview}
        onClose={() => setOpenPreview(null)}
      />
    </div>
  );
}
