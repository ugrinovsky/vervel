import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CameraIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import { aiApi, type AiWorkoutResult } from '@/api/ai';
import { useBalance } from '@/contexts/AuthContext';

const COST_RECOGNIZE = 10;
const MAX_FILE_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png'] as const;

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
      className="flex flex-col items-center justify-center gap-5 py-12"
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
 * Кнопка для атлета/тренера: сфотографировать/загрузить фото тренировки
 * и распознать упражнения через AI. Форма открывается в BottomSheet.
 */
export default function AiWorkoutRecognizer({ onResult }: Props) {
  const { balance, setBalance } = useBalance();
  const hasEnoughBalance = balance === null || balance >= COST_RECOGNIZE;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type as any)) {
      setError('Поддерживаются только JPG и PNG');
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`Файл слишком большой. Максимум ${MAX_FILE_SIZE_MB} МБ`);
      return;
    }

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
      aiApi.getBalance().then((r) => setBalance(r.data.balance)).catch(() => {});
      handleClose();
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

  const sheetHeader = (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500/20">
        <CameraIcon className="w-4 h-4 text-emerald-400" />
      </div>
      <span className="text-lg font-bold text-white">AI-распознавание</span>
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
        className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
      >
        <SparklesIcon className="w-4 h-4" />
        Распознать по фото
        <span className="text-white/30">·</span>
        <span className="text-white/40">{COST_RECOGNIZE}₽</span>
      </button>

      <BottomSheet open={open} onClose={handleClose} header={sheetHeader}>
        <AnimatePresence mode="wait">
          {loading ? (
            <AiLoadingView key="loading" />
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <p className="text-sm text-(--color_text_muted)">
                Сфотографируйте доску, листок или экран с тренировкой — AI распознает упражнения автоматически.
              </p>

              {!preview ? (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="w-full h-36 rounded-xl border-2 border-dashed border-white/20 hover:border-emerald-400/60 flex flex-col items-center justify-center gap-3 text-white/50 hover:text-emerald-400 transition-colors"
                >
                  <CameraIcon className="w-10 h-10" />
                  <span className="text-sm">Нажмите, чтобы выбрать фото</span>
                  <span className="text-xs text-white/30">JPG, PNG · до {MAX_FILE_SIZE_MB} МБ</span>
                </button>
              ) : (
                <div className="relative">
                  <img
                    src={preview}
                    alt="preview"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setPreview(null)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              )}

              <input
                ref={inputRef}
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />

              <p className="text-[11px] text-white/30 text-center">
                Стоимость: <span className="text-white/50">{COST_RECOGNIZE}₽</span> — списывается после отправки
              </p>

              {!hasEnoughBalance && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  Недостаточно средств. Нужно {COST_RECOGNIZE}₽, баланс {balance}₽ — пополните в Профиле.
                </p>
              )}

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleRecognize}
                disabled={!preview || !hasEnoughBalance}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <SparklesIcon className="w-4 h-4" />
                Распознать {COST_RECOGNIZE}₽
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </BottomSheet>
    </>
  );
}
