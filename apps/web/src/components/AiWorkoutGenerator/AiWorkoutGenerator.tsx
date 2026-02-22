import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { aiApi, type AiWorkoutResult } from '@/api/ai';

interface Props {
  onResult: (result: AiWorkoutResult) => void;
}

const EXAMPLES = [
  'Грудь и трицепсы, 45 мин, средний уровень',
  'Ноги и ягодицы, 60 мин, продвинутый',
  'HIIT кроссфит на 30 мин, новичок',
  'Спина и бицепсы, 50 мин',
];

/**
 * Кнопка для тренера: вводит текстовый запрос → AI генерирует тренировку.
 */
export default function AiWorkoutGenerator({ onResult }: Props) {
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
      setOpen(false);
      setPrompt('');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Не удалось сгенерировать тренировку');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPrompt('');
    setError(null);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
      >
        <SparklesIcon className="w-4 h-4" />
        Сгенерировать AI
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-3 rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white flex items-center gap-1.5">
                <SparklesIcon className="w-4 h-4 text-violet-400" />
                AI-генерация тренировки
              </span>
              <button onClick={handleClose} className="text-white/40 hover:text-white transition-colors">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Опишите тренировку: группы мышц, длительность, уровень…"
              rows={3}
              autoFocus
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm resize-none outline-none focus:border-violet-400/60 transition-colors placeholder:text-white/30"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate();
              }}
            />

            {/* Примеры */}
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setPrompt(ex)}
                  className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/50 hover:text-white hover:border-white/25 transition-colors text-left"
                >
                  {ex}
                </button>
              ))}
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="w-full py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 transition-colors disabled:opacity-50"
            >
              {loading ? 'Генерирую…' : 'Сгенерировать'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
