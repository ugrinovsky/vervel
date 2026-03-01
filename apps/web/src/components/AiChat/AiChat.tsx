import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon, PaperAirplaneIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { aiApi } from '@/api/ai';
import { useAuth } from '@/contexts/AuthContext';

const COST_CHAT = 6;

interface Message {
  role: 'user' | 'assistant';
  content: string;
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
  const { balance, setBalance, isTrainer, isAthlete, activeMode } = useAuth();
  const inTrainerMode = isTrainer && (!isAthlete || activeMode === 'trainer');
  const suggestions = inTrainerMode ? TRAINER_SUGGESTIONS : ATHLETE_SUGGESTIONS;
  const hasEnoughBalance = balance === null || balance >= COST_CHAT;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: 'Привет! Я AI-помощник Vervel. Задавай вопросы про тренировки, питание или восстановление — помогу разобраться 💪',
        },
      ]);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading || !hasEnoughBalance) return;

    const userMessage: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError(null);

    const apiMessages = newMessages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await aiApi.chat(apiMessages);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.reply }]);
      setBalance(res.data.balance);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.balance !== undefined) setBalance(data.balance);
      setError(data?.message ?? 'Не удалось получить ответ');
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="background fixed inset-0 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 top-0 bottom-16 bg-(--color_bg) flex flex-col"
          >
            {/* Header — matches FullScreenChat style */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-(--color_border) shrink-0">
              <button
                onClick={onClose}
                className="p-1 text-(--color_text_muted) hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div className="w-7 h-7 flex items-center justify-center rounded-full bg-emerald-500/20 shrink-0">
                <SparklesIcon className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-white truncate">AI-помощник</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium shrink-0">
                    AI
                  </span>
                </div>
                {balance !== null && (
                  <p className={`text-xs mt-0 ${hasEnoughBalance ? 'text-(--color_text_muted)' : 'text-red-400'}`}>
                    {hasEnoughBalance
                      ? `баланс: ${balance}₽ · ${COST_CHAT}₽/сообщение`
                      : `Недостаточно средств (нужно ${COST_CHAT}₽)`}
                  </p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((msg, i) => (
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
                  <div
                    className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-(--color_primary_light) text-white rounded-br-sm'
                        : 'bg-(--color_bg_card) text-white border border-(--color_border) rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
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

              {/* Suggestions — only before user sends first message */}
              {messages.length === 1 && !loading && (
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
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={hasEnoughBalance ? 'Спроси про тренировки…' : 'Пополните баланс в Профиле'}
                  disabled={!hasEnoughBalance || loading}
                  rows={1}
                  className="flex-1 bg-(--color_bg_card) border border-(--color_border) rounded-2xl px-4 py-3 text-white text-sm resize-none outline-none focus:border-emerald-500/50 transition-colors placeholder:text-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ minHeight: '48px', maxHeight: '128px' }}
                  onInput={(e) => {
                    const t = e.currentTarget;
                    t.style.height = 'auto';
                    t.style.height = Math.min(t.scrollHeight, 128) + 'px';
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading || !hasEnoughBalance}
                  className="w-12 h-12 shrink-0 flex items-center justify-center rounded-2xl bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
