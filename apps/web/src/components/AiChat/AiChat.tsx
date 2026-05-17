import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { getApiErrorData, getApiErrorMessage } from '@/utils/apiError';
import { motion } from 'framer-motion';
import { SparklesIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ModalOverlay from '@/components/ModalOverlay/ModalOverlay';
import ReactMarkdown from 'react-markdown';
import { aiApi, type AiChatApiMessage } from '@/api/ai';
import { checkForNewAchievements } from '@/hooks/useAchievementToast';
import { useAuth, useActiveMode } from '@/contexts/AuthContext';
import { useAiBalance } from '@/hooks/useAiBalance';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { AI_CHAT_MIN_BALANCE as MIN_BALANCE } from '@/constants/ai';
const DISPLAY_STEP = 20;
const MAX_INPUT_LENGTH = 1000;

interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  /** Фактически списано ₽ (только у assistant) */
  cost?: number;
}

function mapFromApi(m: AiChatApiMessage): Message {
  if (m.aiGenerated) {
    return {
      id: m.id,
      role: 'assistant',
      content: m.content,
      cost: m.aiCharge ?? undefined,
    };
  }
  return { id: m.id, role: 'user', content: m.content };
}

const ATHLETE_SUGGESTIONS = [
  'Как восстановиться после тяжёлой тренировки?',
  'Какой протеин выбрать для набора массы?',
  'Сколько раз в неделю тренироваться?',
  'Как правильно делать становую тягу?',
];

const TRAINER_SUGGESTIONS = [
  'Как составить план тренировок на месяц для новичка?',
  'Как выстроить периодизацию для набора силы?',
  'Как определить рабочий вес для атлета?',
  'Как мотивировать атлета, который потерял прогресс?',
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AiChat({ open, onClose }: Props) {
  const { user } = useAuth();
  const { isTrainer, isAthlete, activeMode } = useActiveMode();
  const { balance, setBalance, hasEnoughBalance } = useAiBalance(MIN_BALANCE);
  const inTrainerMode = isTrainer && (!isAthlete || activeMode === 'trainer');
  const suggestions = inTrainerMode ? TRAINER_SUGGESTIONS : ATHLETE_SUGGESTIONS;

  const [messages, setMessages] = useState<Message[]>([]);
  const [displayCount, setDisplayCount] = useState(DISPLAY_STEP);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [sessionStartIdx, setSessionStartIdx] = useState(0);
  const prevScrollHeightRef = useRef(0);
  const restoringScrollRef = useRef(false);
  const prevLengthRef = useRef(0);

  // Displayed slice — last `displayCount` messages
  const displayedMessages = messages.slice(-displayCount);
  const hasMoreHistory = displayCount < messages.length;

  // Restore scroll position after expanding history upward
  useLayoutEffect(() => {
    if (restoringScrollRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTop = container.scrollHeight - prevScrollHeightRef.current;
      restoringScrollRef.current = false;
    }
  }, [displayedMessages.length]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    if (open) return;
    setMessages([]);
    setDisplayCount(DISPLAY_STEP);
    setInput('');
    setError(null);
    setLoading(false);
    setHistoryLoading(false);
    setSessionStartIdx(0);
    prevLengthRef.current = 0;
  }, [open]);

  // Expand history when scrolled to top
  const loadMoreHistory = useCallback(() => {
    if (!hasMoreHistory) return;
    const container = scrollContainerRef.current;
    prevScrollHeightRef.current = container?.scrollHeight ?? 0;
    restoringScrollRef.current = true;
    setDisplayCount((prev) => Math.min(prev + DISPLAY_STEP, messages.length));
  }, [hasMoreHistory, messages.length]);

  // IntersectionObserver on top sentinel
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel || messages.length === 0 || historyLoading) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMoreHistory();
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreHistory, messages.length, historyLoading]);

  // Загрузка истории с сервера (таблица messages, как у обычных чатов)
  useEffect(() => {
    if (!open || !user?.id) return;

    let cancelled = false;
    setHistoryLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await aiApi.getChatMessages({ limit: 50 });
        if (cancelled) return;
        const mapped = res.data.data.map(mapFromApi);
        setMessages(mapped);
        setDisplayCount(DISPLAY_STEP);
        setSessionStartIdx(mapped.length);
        setTimeout(() => scrollToBottom('instant'), 50);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'Не удалось загрузить историю'));
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, user?.id, scrollToBottom]);

  // Scroll to bottom on new message/loading
  useEffect(() => {
    if (messages.length > prevLengthRef.current || loading) {
      scrollToBottom('smooth');
    }
    prevLengthRef.current = messages.length;
  }, [messages.length, loading, scrollToBottom]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading || !hasEnoughBalance) return;

    const userMessage: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    // Reveal the new message immediately
    setDisplayCount((prev) =>
      Math.max(prev, newMessages.length - (messages.length - displayCount) + 1)
    );
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await aiApi.chat(text);
      const assistantMsg: Message = {
        role: 'assistant',
        content: res.data.reply,
        cost: res.data.cost,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setBalance(res.data.balance);
      checkForNewAchievements();
    } catch (err: unknown) {
      const data = getApiErrorData(err);
      if (typeof data?.balance === 'number') setBalance(data.balance);
      setError(getApiErrorMessage(err, 'Не удалось получить ответ'));
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = async () => {
    try {
      await aiApi.clearChatMessages();
      setMessages([]);
      setDisplayCount(DISPLAY_STEP);
      setSessionStartIdx(0);
      setError(null);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Не удалось очистить историю'));
    }
  };

  return (
    <ModalOverlay open={open} variant="fullscreen" onClose={onClose}>
      <>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-(--color_border) shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 flex items-center justify-center rounded-full bg-emerald-500/20 shrink-0">
              <SparklesIcon className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <span className="text-base font-semibold text-white truncate block">ИИ-помощник</span>
              {balance !== null && (
                <p
                  className={`text-xs ${hasEnoughBalance ? 'text-(--color_text_muted)' : 'text-red-400'}`}
                >
                  {hasEnoughBalance
                    ? `баланс: ${balance}₽ · ~от ${MIN_BALANCE}₽/сообщение`
                    : `Недостаточно средств (нужно от ${MIN_BALANCE}₽)`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {messages.length > 0 && (
              <Button
                type="button"
                variant="link"
                onClick={() => void handleClearHistory()}
                className="!text-[10px] !no-underline text-(--color_text_muted) hover:!text-white p-0"
              >
                Очистить
              </Button>
            )}
            <Button
              type="button"
              variant="unstyled"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              aria-label="Закрыть"
            >
              <XMarkIcon className="w-4 h-4 text-white" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {/* Top sentinel — triggers loading older messages */}
          <div ref={topSentinelRef} className="h-px" />

          {historyLoading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="sm" variant="emeraldAccent" />
            </div>
          )}

          {messages.length === 0 && !historyLoading && !error && (
            <p className="text-sm text-(--color_text_secondary) pl-9 pr-2 leading-relaxed">
              Привет! Я ИИ-помощник Vervel. Задавай вопросы про тренировки, питание или
              восстановление — помогу разобраться 💪
            </p>
          )}

          {/* Loading older indicator */}
          {!historyLoading && hasMoreHistory && (
            <div className="flex justify-center py-1">
              <LoadingSpinner size="xs" variant="emeraldAccent" />
            </div>
          )}

          {!historyLoading &&
            displayedMessages.map((msg, i) => (
              <motion.div
                key={msg.id ?? `${msg.role}-${i}-${msg.content.slice(0, 12)}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                    <SparklesIcon className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                )}
                <div className="max-w-[80%] flex flex-col gap-1">
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-(--color_primary_light) text-white rounded-br-sm whitespace-pre-wrap'
                        : 'glass text-white rounded-bl-sm ai-markdown'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    )}
                  </div>
                  {msg.role === 'assistant' && msg.cost !== undefined && (
                    <p className="text-[10px] text-(--color_text_muted) pl-1">
                      списано {msg.cost}₽
                    </p>
                  )}
                </div>
              </motion.div>
            ))}

          {/* Loading indicator */}
          {!historyLoading && loading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <SparklesIcon className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="glass px-3.5 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Suggestions — only at the start of session */}
          {messages.length === sessionStartIdx && !loading && !historyLoading && (
            <div className="pt-2">
              <p className="text-[10px] text-(--color_text_muted) uppercase tracking-wider mb-2 pl-9">
                Попробуйте спросить
              </p>
              <div className="pl-9 flex flex-col gap-1.5">
                {suggestions.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant="unstyled"
                    fullWidth
                    onClick={() => setInput(s)}
                    className="glass text-left text-xs px-3 py-2 rounded-xl text-(--color_text_secondary) hover:text-white hover:border-emerald-500/30 transition-colors"
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 ml-9">
              {error}
            </p>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="shrink-0 px-4 pb-4 pt-3 border-t border-(--color_border)">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))}
                onKeyDown={handleKeyDown}
                placeholder={
                  hasEnoughBalance ? 'Спроси про тренировки…' : 'Пополните баланс в Профиле'
                }
                disabled={!hasEnoughBalance || loading}
                rows={1}
                className="w-full bg-(--color_bg_card) border border-(--color_border) rounded-2xl px-4 py-3 text-white text-sm resize-none outline-none focus:border-emerald-500/50 transition-colors placeholder:text-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minHeight: '48px', maxHeight: '128px' }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 128) + 'px';
                }}
              />
              {input.length > MAX_INPUT_LENGTH * 0.8 && (
                <span
                  className={`absolute bottom-2 right-3 text-[10px] pointer-events-none ${input.length >= MAX_INPUT_LENGTH ? 'text-red-400' : 'text-white/30'}`}
                >
                  {input.length}/{MAX_INPUT_LENGTH}
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="emerald"
              onClick={handleSend}
              disabled={!input.trim() || loading || !hasEnoughBalance}
              className="w-12 h-12 shrink-0 !rounded-2xl p-0"
              aria-label="Отправить"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </>
    </ModalOverlay>
  );
}
