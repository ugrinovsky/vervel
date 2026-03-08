import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { SparklesIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ModalOverlay from '@/components/ModalOverlay/ModalOverlay';
import ReactMarkdown from 'react-markdown';
import { aiApi } from '@/api/ai';
import { checkForNewAchievements } from '@/hooks/useAchievementToast';
import { useAuth } from '@/contexts/AuthContext';
import { AI_CHAT_MIN_BALANCE as MIN_BALANCE } from '@/constants/ai';
const DISPLAY_STEP = 20;
const MAX_INPUT_LENGTH = 1000;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  /** Фактически списано ₽ (только у assistant) */
  cost?: number;
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
  const { balance, setBalance, isTrainer, isAthlete, activeMode, user } = useAuth();
  const inTrainerMode = isTrainer && (!isAthlete || activeMode === 'trainer');
  const suggestions = inTrainerMode ? TRAINER_SUGGESTIONS : ATHLETE_SUGGESTIONS;
  const hasEnoughBalance = balance === null || balance >= MIN_BALANCE;

  const storageKey = user?.id ? `aiChat_${user.id}` : null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [displayCount, setDisplayCount] = useState(DISPLAY_STEP);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sessionStartIdx = useRef(0);
  const prevScrollHeightRef = useRef(0);
  const restoringScrollRef = useRef(false);

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

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

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
    if (!sentinel || messages.length === 0) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMoreHistory();
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreHistory, messages.length]);

  // Load history from localStorage on first open
  useEffect(() => {
    if (!open || !storageKey) return;
    if (messages.length > 0) return;

    const stored = localStorage.getItem(storageKey);
    const history: Message[] = stored ? JSON.parse(stored) : [];

    const greeting: Message = {
      role: 'assistant',
      content:
        'Привет! Я AI-помощник Vervel. Задавай вопросы про тренировки, питание или восстановление — помогу разобраться 💪',
    };

    if (history.length > 0) {
      setMessages(history);
      setDisplayCount(DISPLAY_STEP); // always start showing last 20
      sessionStartIdx.current = history.length;
    } else {
      setMessages([greeting]);
      setDisplayCount(DISPLAY_STEP);
      sessionStartIdx.current = 1;
    }

    // Scroll to bottom after loading history
    setTimeout(() => scrollToBottom('instant'), 50);
  }, [open, storageKey]);

  // Persist history on messages change
  useEffect(() => {
    if (!storageKey || messages.length === 0) return;
    localStorage.setItem(storageKey, JSON.stringify(messages.slice(-50)));
  }, [messages, storageKey]);

  // Scroll to bottom on new message/loading
  const prevLengthRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevLengthRef.current || loading) {
      scrollToBottom('smooth');
    }
    prevLengthRef.current = messages.length;
  }, [messages.length, loading]);

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

    const contextMessages = newMessages
      .slice(1)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await aiApi.chat(contextMessages);
      const assistantMsg: Message = {
        role: 'assistant',
        content: res.data.reply,
        cost: res.data.cost,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setBalance(res.data.balance);
      checkForNewAchievements();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.balance !== undefined) setBalance(data.balance);
      setError(data?.message ?? 'Не удалось получить ответ');
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

  const handleClearHistory = () => {
    if (!storageKey) return;
    localStorage.removeItem(storageKey);
    const greeting: Message = {
      role: 'assistant',
      content:
        'Привет! Я AI-помощник Vervel. Задавай вопросы про тренировки, питание или восстановление — помогу разобраться 💪',
    };
    setMessages([greeting]);
    setDisplayCount(DISPLAY_STEP);
    sessionStartIdx.current = 1;
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
                  <span className="text-base font-semibold text-white truncate block">AI-помощник</span>
                  {balance !== null && (
                    <p className={`text-xs ${hasEnoughBalance ? 'text-(--color_text_muted)' : 'text-red-400'}`}>
                      {hasEnoughBalance
                        ? `баланс: ${balance}₽ · ~от ${MIN_BALANCE}₽/сообщение`
                        : `Недостаточно средств (нужно от ${MIN_BALANCE}₽)`}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {messages.length > 1 && (
                  <button
                    onClick={handleClearHistory}
                    className="text-[10px] text-(--color_text_muted) hover:text-white transition-colors"
                  >
                    Очистить
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {/* Top sentinel — triggers loading older messages */}
              <div ref={topSentinelRef} className="h-px" />

              {/* Loading older indicator */}
              {hasMoreHistory && (
                <div className="flex justify-center py-1">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-emerald-400 rounded-full animate-spin" />
                </div>
              )}

              {displayedMessages.map((msg, i) => (
                <motion.div
                  key={i}
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
                          : 'bg-(--color_bg_card) text-white border border-(--color_border) rounded-bl-sm ai-markdown'
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
              {loading && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                    <SparklesIcon className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="px-3.5 py-3 bg-(--color_bg_card) border border-(--color_border) rounded-2xl rounded-bl-sm">
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
              {messages.length === sessionStartIdx.current && !loading && (
                <div className="pt-2">
                  <p className="text-[10px] text-(--color_text_muted) uppercase tracking-wider mb-2 pl-9">
                    Попробуйте спросить
                  </p>
                  <div className="pl-9 flex flex-col gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        className="text-left text-xs px-3 py-2 rounded-xl bg-(--color_bg_card) border border-(--color_border) text-(--color_text_secondary) hover:text-white hover:border-emerald-500/30 transition-colors"
                      >
                        {s}
                      </button>
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
              <div className="flex items-end gap-2">
                <div className="relative flex-1">
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
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading || !hasEnoughBalance}
                  className="w-12 h-12 shrink-0 flex items-center justify-center rounded-2xl bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
      </>
    </ModalOverlay>
  );
}
