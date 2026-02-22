import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CameraIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { aiApi, type AiWorkoutResult } from '@/api/ai';

interface Props {
  onResult: (result: AiWorkoutResult) => void;
}

/**
 * Кнопка для атлета: сфотографировать/загрузить фото тренировки
 * и распознать упражнения через AI.
 */
export default function AiWorkoutRecognizer({ onResult }: Props) {
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
      // Извлекаем base64 и mimeType из data URL
      const [meta, base64] = preview.split(',');
      const mimeType = meta.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg';
      const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const;
      const safeMime = validMimes.includes(mimeType as any)
        ? (mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic')
        : 'image/jpeg';

      const res = await aiApi.recognizeWorkout(base64, safeMime);
      onResult(res.data.data);
      setOpen(false);
      setPreview(null);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Не удалось распознать тренировку');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
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
            className="mt-3 rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white flex items-center gap-1.5">
                <SparklesIcon className="w-4 h-4 text-emerald-400" />
                AI-распознавание
              </span>
              <button onClick={handleClose} className="text-white/40 hover:text-white transition-colors">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

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

            {error && <p className="text-xs text-red-400">{error}</p>}

            {preview && (
              <button
                type="button"
                onClick={handleRecognize}
                disabled={loading}
                className="w-full py-2 rounded-xl bg-emerald-500 text-black text-sm font-medium hover:bg-emerald-400 transition-colors disabled:opacity-50"
              >
                {loading ? 'Распознаю…' : 'Распознать тренировку'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
