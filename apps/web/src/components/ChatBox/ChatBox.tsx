import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { chatApi } from '@/api/chat';
import type { ChatMessage, ExerciseData } from '@/api/trainer';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

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

const TYPE_CONFIG = {
  crossfit: { emoji: '🔥', label: 'CrossFit', color: 'text-orange-400' },
  bodybuilding: { emoji: '💪', label: 'Силовая', color: 'text-blue-400' },
  cardio: { emoji: '🏃', label: 'Кардио', color: 'text-green-400' },
};

function WorkoutPreviewCard({ data, onClick }: { data: WorkoutPreviewData; onClick?: () => void }) {
  const [y, m, d] = data.date.split('-').map(Number);
  const dateStr = format(new Date(y, m - 1, d), 'd MMMM', { locale: ru });
  const cfg = TYPE_CONFIG[data.workoutType];

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm w-full ${onClick ? 'cursor-pointer hover:bg-white/10 transition-colors active:scale-[0.99]' : ''}`}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-white/5 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">{cfg.emoji}</span>
            <span className="text-sm font-semibold text-white">Тренировка</span>
          </div>
          <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
        </div>
        <div className="text-xs text-white/50 mt-0.5">
          📅 {dateStr} · {data.time}
        </div>
      </div>

      {/* Exercises */}
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

      {/* Notes */}
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

function WorkoutDetailSheet({ data, open, onClose }: { data: WorkoutPreviewData | null; open: boolean; onClose: () => void }) {
  if (!data) return null;
  const [y, m, d] = data.date.split('-').map(Number);
  const dateStr = format(new Date(y, m - 1, d), 'd MMMM yyyy', { locale: ru });
  const cfg = TYPE_CONFIG[data.workoutType];

  // Group consecutive exercises with same blockId into supersets
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
            <span className="text-2xl">{cfg.emoji}</span>
            <span className="text-lg font-bold text-white">Тренировка</span>
          </div>
          <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Date & time */}
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

        {/* Exercises */}
        {data.exercises.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
              Упражнения ({data.exercises.length})
            </div>
            <div className="space-y-2">
              {blocks.map((block, bi) =>
                block.superset ? (
                  /* Superset block */
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
                  /* Single exercise */
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

        {/* General notes */}
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
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [openPreview, setOpenPreview] = useState<WorkoutPreviewData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async (markRead = false) => {
    try {
      const res = await chatApi.getMessages(chatId);
      setMessages(res.data.data);
      if (loading) {
        setTimeout(scrollToBottom, 100);
      }
      if (markRead) {
        chatApi.markAsRead(chatId).catch(() => {});
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      if (loading) {
        toast.error('Ошибка загрузки сообщений');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(true); // mark as read on open

    // Polling every 10 seconds
    const interval = setInterval(() => {
      fetchMessages(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const res = await chatApi.sendMessage(chatId, messageContent);
      setMessages((prev) => [...prev, res.data.data]);
      scrollToBottom();
    } catch {
      toast.error('Ошибка отправки сообщения');
      setNewMessage(messageContent); // Restore message on error
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

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-[var(--color_text_muted)]">Загрузка чата...</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-sm text-[var(--color_text_muted)]">
              Пока нет сообщений. Начните беседу!
            </p>
          </div>
        ) : (
          <AnimatePresence>
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
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                  >
                    {showSender && (
                      <div className="text-xs text-[var(--color_text_muted)] mb-1.5 px-1">
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
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] ${
                      isCurrentUser
                        ? 'bg-[var(--color_primary_light)] text-white'
                        : 'bg-[var(--color_bg_card_hover)] text-white'
                    } rounded-2xl px-4 py-2`}
                  >
                    {showSender && !isCurrentUser && (
                      <div className="text-xs text-[var(--color_text_muted)] mb-1">
                        {message.sender.fullName || 'Без имени'}
                      </div>
                    )}
                    <div className="text-sm break-words">{message.content}</div>
                    <div
                      className={`text-xs mt-1 ${
                        isCurrentUser ? 'text-white/70' : 'text-[var(--color_text_muted)]'
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
      <div className="p-4 border-t border-[var(--color_border)] mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Написать сообщение..."
            disabled={sending}
            className="flex-1 bg-[var(--color_bg_input)] border border-[var(--color_border)] rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-[var(--color_primary_light)] transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 rounded-xl bg-[var(--color_primary_light)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Workout detail sheet */}
      <WorkoutDetailSheet
        data={openPreview}
        open={!!openPreview}
        onClose={() => setOpenPreview(null)}
      />
    </div>
  );
}
