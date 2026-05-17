import { PlusIcon } from '@heroicons/react/24/outline';
import AiWorkoutGenerator from '@/components/AiWorkoutGenerator/AiWorkoutGenerator';
import AiWorkoutRecognizer from '@/components/AiWorkoutRecognizer/AiWorkoutRecognizer';
import AiWorkoutTextParser from '@/components/AiWorkoutTextParser/AiWorkoutTextParser';
import type { AiRecognizedWorkoutResult, AiTextParseUiPayload, AiWorkoutResult } from '@/api/ai';

interface Props {
  onAiGenerated: (result: AiWorkoutResult) => void;
  onAiRecognized: (result: AiRecognizedWorkoutResult) => void;
  onAiTextParsed: (payload: AiTextParseUiPayload) => void;
  onOpenCatalog: () => void;
  onOpenCustom: () => void;
  className?: string;
}

export default function WorkoutAiEmptyState({
  onAiGenerated,
  onAiRecognized,
  onAiTextParsed,
  onOpenCatalog,
  onOpenCustom,
  className = '',
}: Props) {
  return (
    <div className={`glass rounded-2xl p-4 space-y-2 ${className}`}>
      <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-3">
        Как добавить упражнения?
      </p>
      <AiWorkoutRecognizer
        onResult={onAiRecognized}
        triggerClassName="w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-left hover:bg-emerald-500/15 transition-colors"
        triggerContent={
          <>
            <span className="text-xl shrink-0">📸</span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-white">Распознать изображение</span>
              <span className="block text-xs text-(--color_text_muted)">ИИ распознает по фото</span>
            </span>
            <span className="text-emerald-400/60 text-base shrink-0">→</span>
          </>
        }
      />
      <AiWorkoutTextParser
        onResult={onAiTextParsed}
        triggerClassName="w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-left hover:bg-emerald-500/15 transition-colors"
        triggerContent={
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
        }
      />
      <AiWorkoutGenerator
        onResult={onAiGenerated}
        triggerClassName="w-full flex items-center gap-3 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-left hover:bg-violet-500/15 transition-colors"
        triggerContent={
          <>
            <span className="text-xl shrink-0">✨</span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-white">
                Сгенерировать по описанию
              </span>
              <span className="block text-xs text-(--color_text_muted)">
                ИИ сам подберёт упражнения, подходы и веса
              </span>
            </span>
            <span className="text-violet-400/60 text-base shrink-0">→</span>
          </>
        }
      />
      <div className="flex items-center gap-2 my-1">
        <div className="h-px bg-white/10 flex-1" />
        <span className="text-[10px] text-white/30 shrink-0">или выбрать вручную</span>
        <div className="h-px bg-white/10 flex-1" />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onOpenCatalog}
          className="flex-1 flex items-center justify-center gap-2 py-1.5 px-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.08] hover:border-white/20 transition-colors"
        >
          <PlusIcon className="w-4 h-4 text-white/50" />
          <span className="text-sm font-medium text-white">Из каталога</span>
        </button>
        <button
          type="button"
          onClick={onOpenCustom}
          className="flex-1 flex items-center justify-center gap-2 py-1.5 px-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.08] hover:border-white/20 transition-colors"
        >
          <span>✏️</span>
          <span className="text-sm font-medium text-white">Свои</span>
        </button>
      </div>
    </div>
  );
}
