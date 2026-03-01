import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CameraIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { aiApi, type AiWorkoutResult } from '@/api/ai';
import { useAuth } from '@/contexts/AuthContext';

const COST_RECOGNIZE = 9;

interface Props {
  onResult: (result: AiWorkoutResult) => void;
}

const LOADING_STEPS = [
  'Распознаю упражнения…',
  'Анализирую структуру…',
  'Сопоставляю с каталогом…',
  'Собираю результат…',
];

function AiLoadingView() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => (i + 1) % LOADING_STEPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      key="loader"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col items-center justify-center gap-5 py-8"
    >
      <div className="relative flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-20 h-20 rounded-full bg-emerald-500/30"
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.15, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          className="absolute w-14 h-14 rounded-full bg-emerald-400/30"
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="relative z-10 w-10 h-10 flex items-center justify-center rounded-full bg-linear-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/40"
        >
          <SparklesIcon className="w-5 h-5 text-white" />
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={stepIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="text-sm text-emerald-300 font-medium"
        >
          {LOADING_STEPS[stepIndex]}
        </motion.p>
      </AnimatePresence>

      <div className="flex gap-1.5">
        {LOADING_STEPS.map((_, i) => (
          <motion.div
            key={i}
            animate={{ opacity: i === stepIndex ? 1 : 0.25 }}
            transition={{ duration: 0.3 }}
            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
          />
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Кнопка для атлета: сфотографировать/загрузить фото тренировки
 * и распознать упражнения через AI.
 */
export default function AiWorkoutRecognizer({ onResult }: Props) {
  const { balance, setBalance } = useAuth();
  const hasEnoughBalance = balance === null || balance >= COST_RECOGNIZE;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRecognize = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);

    try {
      const [meta, base64] = preview.split(',');
      const mimeType = meta.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg';
      const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const;
      const safeMime = validMimes.includes(mimeType as any)
        ? (mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic')
        : 'image/jpeg';

      const res = await aiApi.recognizeWorkout(base64, safeMime);
      onResult(res.data.data);
      // Refresh balance after successful charge
      aiApi.getBalance().then((r) => setBalance(r.data.balance)).catch(() => {});
      setOpen(false);
      setPreview(null);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.balance !== undefined) setBalance(data.balance);
      setError(data?.message ?? 'Не удалось распознать тренировку');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setOpen(false);
    setPreview(null);
    setError(null);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
      >
        <SparklesIcon className="w-4 h-4" />
        Распознать по фото
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-3 rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white flex items-center gap-1.5">
                <SparklesIcon className="w-4 h-4 text-emerald-400" />
                AI-распознавание
                {balance !== null && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${hasEnoughBalance ? 'bg-white/10 text-white/50' : 'bg-red-500/20 text-red-400'}`}>
                    баланс: {balance}₽
                  </span>
                )}
              </span>
              {!loading && (
                <button onClick={handleClose} className="text-white/40 hover:text-white transition-colors">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {loading ? (
                <AiLoadingView key="loading" />
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {!preview ? (
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="w-full h-28 rounded-xl border-2 border-dashed border-white/20 hover:border-emerald-400/60 flex flex-col items-center justify-center gap-2 text-white/50 hover:text-emerald-400 transition-colors"
                    >
                      <CameraIcon className="w-8 h-8" />
                      <span className="text-xs">Фото доски или листка с тренировкой</span>
                    </button>
                  ) : (
                    <div className="relative">
                      <img
                        src={preview}
                        alt="preview"
                        className="w-full h-40 object-cover rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setPreview(null)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                    }}
                  />

                  {!hasEnoughBalance && (
                    <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                      Недостаточно средств. Нужно {COST_RECOGNIZE}₽, баланс {balance}₽.
                    </p>
                  )}

                  {error && <p className="text-xs text-red-400">{error}</p>}

                  {preview && (
                    <button
                      type="button"
                      onClick={handleRecognize}
                      disabled={!hasEnoughBalance}
                      className="w-full py-2 rounded-xl bg-emerald-500 text-black text-sm font-medium hover:bg-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Распознать {COST_RECOGNIZE}₽
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
