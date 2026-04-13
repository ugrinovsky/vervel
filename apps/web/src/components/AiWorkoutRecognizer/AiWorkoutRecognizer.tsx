import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CameraIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import AiLoadingView from '@/components/ui/AiLoadingView';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import { aiApi, type AiRecognizedWorkoutResult } from '@/api/ai';
import { useAiBalance } from '@/hooks/useAiBalance';

const COST_RECOGNIZE = 10;
const MAX_FILE_SIZE_MB = 20;
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
] as const;

type ValidMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic';

function getFileMime(file: File): ValidMime {
  if (/\.heic$/i.test(file.name) || /\.heif$/i.test(file.name)) return 'image/heic';
  const valid: ValidMime[] = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  return valid.includes(file.type as ValidMime) ? (file.type as ValidMime) : 'image/jpeg';
}

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target!.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface Props {
  onResult: (result: AiRecognizedWorkoutResult, photoUrl: string) => void;
  triggerClassName?: string;
  triggerContent?: React.ReactNode;
}

const LOADING_STEPS = [
  'Распознаю упражнения…',
  'Анализирую структуру…',
  'Сопоставляю с каталогом…',
  'Собираю результат…',
];

export default function AiWorkoutRecognizer({ onResult, triggerClassName, triggerContent }: Props) {
  const { balance, setBalance, hasEnoughBalance } = useAiBalance(COST_RECOGNIZE);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleFile = (file: File) => {
    setError(null);

    const mimeOk =
      ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number]) ||
      file.type === '' ||
      /\.(jpe?g|png|heic|heif|webp)$/i.test(file.name);
    if (!mimeOk) {
      setError('Поддерживаются JPG, PNG, HEIC, WebP');
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`Файл слишком большой. Максимум ${MAX_FILE_SIZE_MB} МБ`);
      return;
    }

    clearFile();
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRecognize = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);

    try {
      const base64 = await readBase64(selectedFile);
      const mimeType = getFileMime(selectedFile);
      const res = await aiApi.recognizeWorkout(base64, mimeType);
      const photoUrl = URL.createObjectURL(selectedFile);
      onResult(res.data.data, photoUrl);
      aiApi
        .getBalance()
        .then((r) => setBalance(r.data.balance))
        .catch(() => {});
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
    clearFile();
    setOpen(false);
    setError(null);
  };

  const sheetHeader = (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500/20">
        <CameraIcon className="w-4 h-4 text-emerald-400" />
      </div>
      <span className="text-lg font-bold text-white">ИИ-распознавание</span>
      {balance !== null && (
        <span
          className={`ml-1 text-xs px-2 py-0.5 rounded-full ${hasEnoughBalance ? 'bg-white/10 text-white/50' : 'bg-red-500/20 text-red-400'}`}
        >
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
            Распознать по фото
            <span className="text-white/30">·</span>
            <span className="text-white/40">{COST_RECOGNIZE}₽</span>
          </>
        )}
      </button>

      <BottomSheet
        id="ai-workout-recognizer"
        open={open}
        onClose={handleClose}
        header={sheetHeader}
      >
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
                По фото ИИ распознает упражнения автоматически.
              </p>

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className={`w-full h-14 rounded-xl border-2 border-dashed flex items-center gap-3 px-4 transition-colors ${
                  selectedFile
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : 'border-white/20 hover:border-emerald-400/60 text-white/50 hover:text-emerald-400'
                }`}
              >
                <CameraIcon className="w-5 h-5 shrink-0" />
                <span className="text-sm truncate flex-1 text-left">
                  {selectedFile ? selectedFile.name : 'Нажмите, чтобы выбрать фото'}
                </span>
                {selectedFile && (
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                    className="shrink-0 text-white/40 hover:text-white/70 cursor-pointer"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </span>
                )}
              </button>

              <input
                ref={inputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.heic,.heif,.webp,image/jpeg,image/png,image/heic,image/heif,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = '';
                }}
              />

              <p className="text-[11px] text-white/30 text-center">
                Стоимость: <span className="text-white/50">{COST_RECOGNIZE}₽</span> — списывается
                после отправки
              </p>

              {(error || (balance !== null && balance < COST_RECOGNIZE)) && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  {error ??
                    `Недостаточно средств. Нужно ${COST_RECOGNIZE}₽, баланс ${balance}₽ — пополните в Профиле.`}
                </p>
              )}

              <button
                type="button"
                onClick={handleRecognize}
                disabled={!selectedFile || !hasEnoughBalance}
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
