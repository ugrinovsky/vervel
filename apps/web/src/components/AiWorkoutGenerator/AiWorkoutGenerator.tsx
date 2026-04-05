import { useState } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import AiLoadingView from '@/components/ui/AiLoadingView';
import { aiApi, type AiWorkoutResult } from '@/api/ai';
import { useAiBalance } from '@/hooks/useAiBalance';

const COST_GENERATE = 10;
const MAX_PROMPT_LENGTH = 600;

interface Props {
  onResult: (result: AiWorkoutResult) => void;
  triggerClassName?: string;
  triggerContent?: React.ReactNode;
}

const EXAMPLES = [
  'Грудь и трицепсы, 45 мин, средний уровень',
  'Ноги и ягодицы, 60 мин, продвинутый',
  'HIIT кроссфит на 30 мин, новичок',
  'Спина и бицепсы, 50 мин',
];

const LOADING_STEPS = [
  'Анализирую запрос…',
  'Подбираю упражнения…',
  'Составляю план тренировки…',
  'Финальные штрихи…',
];


export default function AiWorkoutGenerator({ onResult, triggerClassName, triggerContent }: Props) {
  const { balance, setBalance, hasEnoughBalance } = useAiBalance(COST_GENERATE);

  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await aiApi.generateWorkout(prompt.trim());
      onResult(res.data.data);
      // Refresh balance after successful charge
      aiApi.getBalance().then((r) => setBalance(r.data.balance)).catch(() => {});
      handleClose();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.balance !== undefined) setBalance(data.balance);
      setError(data?.message ?? 'Не удалось сгенерировать тренировку');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setOpen(false);
    setPrompt('');
    setError(null);
  };

  const sheetHeader = (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500/20">
        <SparklesIcon className="w-4 h-4 text-emerald-400" />
      </div>
      <span className="text-lg font-bold text-white">ИИ-генерация</span>
      {balance !== null && (
        <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${hasEnoughBalance ? 'bg-white/10 text-white/50' : 'bg-red-500/20 text-red-400'}`}>
          баланс: {balance}₽
        </span>
      )}
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName ?? 'flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors'}
      >
        {triggerContent ?? (
          <>
            <SparklesIcon className="w-4 h-4" />
            Сгенерировать ИИ
          </>
        )}
      </button>

      <BottomSheet id="ai-workout-generator" open={open} onClose={handleClose} header={sheetHeader}>
        <AnimatePresence mode="wait">
          {loading ? (
            <AiLoadingView key="loading" steps={LOADING_STEPS} />
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <p className="text-sm text-(--color_text_muted)">
                Опишите тренировку — ИИ подберёт упражнения, подходы и веса.
              </p>

              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT_LENGTH))}
                  placeholder="Например: грудь и трицепсы, 45 мин, средний уровень…"
                  rows={4}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm resize-none outline-none focus:border-emerald-400/60 transition-colors placeholder:text-white/30"
                />
                <span className={`absolute bottom-2 right-3 text-[10px] ${prompt.length >= MAX_PROMPT_LENGTH ? 'text-red-400' : 'text-white/25'}`}>
                  {prompt.length}/{MAX_PROMPT_LENGTH}
                </span>
              </div>

              {/* Примеры */}
              <div>
                <p className="text-[10px] text-(--color_text_muted) uppercase tracking-wider mb-2">
                  Примеры запросов
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setPrompt(ex)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50 hover:text-white hover:border-white/25 transition-colors text-left"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {!hasEnoughBalance && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  Недостаточно средств. Нужно {COST_GENERATE}₽, баланс {balance}₽ — пополните в Профиле.
                </p>
              )}

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleGenerate}
                disabled={!prompt.trim() || !hasEnoughBalance}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <SparklesIcon className="w-4 h-4" />
                Сгенерировать {COST_GENERATE}₽
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </BottomSheet>
    </>
  );
}
