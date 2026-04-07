import { useMemo, useState } from 'react';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import { DocumentTextIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { aiApi } from '@/api/ai';
import AccentButton from '@/components/ui/AccentButton';
import AiLoadingView from '@/components/ui/AiLoadingView';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  onResult: (payload: {
    sourceText: string;
    previewItems: Array<{
      exerciseId: string;
      name: string;
      sets: number;
      reps?: number;
      weight?: number;
      weightMax?: number;
    }>;
    exercises: Array<{
      exerciseId: string;
      type: string;
      sets?: Array<{ id: string; reps?: number; weight?: number; time?: number }>;
      blockId?: string;
    }>;
    warning: string | null;
  }) => void;
  triggerClassName?: string;
  triggerContent?: React.ReactNode;
}

export default function AiWorkoutTextParser({ onResult, triggerClassName, triggerContent }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const LOADING_STEPS = useMemo(
    () => ['Чищу текст…', 'Разбираю упражнения…', 'Проверяю подходы и веса…', 'Собираю результат…'],
    []
  );

  const header = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500/20">
          <DocumentTextIcon className="w-4 h-4 text-emerald-400" />
        </div>
        <span className="text-lg font-bold text-white">Разбор текста</span>
      </div>
    ),
    []
  );

  const close = () => {
    if (busy) return;
    setOpen(false);
    setError(null);
  };

  const run = async () => {
    if (busy) return;
    const notes = text.trim();
    if (!notes) return;
    setBusy(true);
    setError(null);
    try {
      const res = await aiApi.parseNotesText(notes);
      onResult({
        sourceText: notes,
        previewItems: res.data.previewItems,
        exercises: res.data.exercises,
        warning: res.data.warning,
      });
      close();
      setText('');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(typeof msg === 'string' && msg.trim() ? msg : 'Не удалось распарсить текст');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          'w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-left hover:bg-emerald-500/15 transition-colors'
        }
      >
        {triggerContent ?? (
          <>
            <span className="text-xl shrink-0">📝</span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-white">Распознать по тексту</span>
              <span className="block text-xs text-(--color_text_muted)">
                ИИ распознает по тексту
              </span>
            </span>
            <span className="text-emerald-400/60 text-base shrink-0">→</span>
          </>
        )}
      </button>

      <BottomSheet id="ai-workout-text-parser" open={open} onClose={close} header={header}>
        <AnimatePresence mode="wait">
          {busy ? (
            <AiLoadingView key="loading" steps={LOADING_STEPS} />
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 pb-4"
            >
              <p className="text-sm text-(--color_text_muted)">
                Вставьте программу тренировки — ИИ распарсит упражнения, подходы и веса.
              </p>

              <div className="relative">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`Например:
Жим лёжа 3×10 60кг
Тяга 3×12 40кг
Подтягивания - макс`}
                  rows={6}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm resize-none outline-none focus:border-emerald-400/60 transition-colors placeholder:text-white/30"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <AccentButton
                type="button"
                onClick={() => void run()}
                disabled={text.trim().length < 5}
                className="gap-2 !bg-emerald-600 hover:!bg-emerald-500"
              >
                <SparklesIcon className="w-4 h-4" />
                Распарсить текст
              </AccentButton>
            </motion.div>
          )}
        </AnimatePresence>
      </BottomSheet>
    </>
  );
}
