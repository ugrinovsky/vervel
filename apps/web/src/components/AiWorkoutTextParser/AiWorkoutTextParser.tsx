import { useEffect, useMemo, useState } from 'react';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import { getApiErrorMessage } from '@/utils/apiError';
import { DocumentTextIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { aiApi, type AiTextParseUiPayload } from '@/api/ai';
import AccentButton from '@/components/ui/AccentButton';
import AiLoadingView from '@/components/ui/AiLoadingView';
import { AnimatePresence, motion } from 'framer-motion';
import { useAiBalance } from '@/hooks/useAiBalance';
import AiSheetHeader from '@/components/ui/AiSheetHeader';
import AiCostNotice from '@/components/ui/AiCostNotice';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';

interface Props {
  onResult: (payload: AiTextParseUiPayload) => void;
  triggerClassName?: string;
  triggerContent?: React.ReactNode;
}

export default function AiWorkoutTextParser({ onResult, triggerClassName, triggerContent }: Props) {
  const [cost, setCost] = useState(10);
  const { balance, setBalance, hasEnoughBalance } = useAiBalance(cost);

  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const LOADING_STEPS = useMemo(
    () => ['Чищу текст…', 'Разбираю упражнения…', 'Проверяю подходы и веса…', 'Собираю результат…'],
    []
  );

  const header = useMemo(() => {
    return (
      <AiSheetHeader
        icon={<DocumentTextIcon className="w-4 h-4 text-emerald-400" />}
        title="Разбор текста"
        balance={balance}
        hasEnoughBalance={hasEnoughBalance}
      />
    );
  }, [balance, hasEnoughBalance]);

  useEffect(() => {
    if (!open) return;
    aiApi
      .getBalance()
      .then((r) => {
        if (typeof r.data.costs?.parseNotes === 'number') setCost(r.data.costs.parseNotes);
        setBalance(r.data.balance);
      })
      .catch(() => {});
  }, [open, setBalance]);

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
      if (typeof res.data.balance === 'number') setBalance(res.data.balance);
      const parsed = res.data.exercises ?? [];
      if (parsed.length === 0) {
        setError(
          res.data.warning?.trim() ||
            'Не удалось распознать ни одного упражнения — проверьте формат текста'
        );
        return;
      }
      onResult({
        sourceText: notes,
        previewItems: res.data.previewItems,
        exercises: parsed,
        warning: res.data.warning,
      });
      close();
      setText('');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Не удалось распарсить текст'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="unstyled"
        fullWidth
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          'flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-left hover:bg-emerald-500/15 transition-colors'
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
            <span className="text-xs text-white/40 shrink-0">{cost}₽</span>
            <span className="text-emerald-400/60 text-base shrink-0">→</span>
          </>
        )}
      </Button>

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

              <AiCostNotice cost={cost} actionLabel="разбор текста" />

              {balance !== null && balance < cost && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  Недостаточно средств. Нужно {cost}₽, баланс {balance}₽ — пополните в Профиле.
                </p>
              )}

              <div className="relative">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`Например:
Жим лёжа 3×10 60кг
Тяга 3×12 40кг
Подтягивания - макс`}
                  rows={6}
                  className="!bg-white/5 !border-white/15 focus:!border-emerald-400/60 placeholder:!text-white/30"
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
                disabled={text.trim().length < 5 || !hasEnoughBalance}
                className="gap-2 !bg-emerald-600 hover:!bg-emerald-500"
              >
                <SparklesIcon className="w-4 h-4" />
                Распарсить текст {cost}₽
              </AccentButton>
            </motion.div>
          )}
        </AnimatePresence>
      </BottomSheet>
    </>
  );
}
