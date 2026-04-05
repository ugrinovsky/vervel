import { InformationCircleIcon } from '@heroicons/react/24/outline';

/** Короткий контекст вверху BottomSheet на аналитике — зачем блок и что означают цифры */
export function AnalyticsSheetIntro({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex gap-2.5 rounded-xl border border-(--color_border) bg-(--color_bg_card) px-3 py-2.5">
      <InformationCircleIcon
        className="w-5 h-5 shrink-0 text-(--color_primary_icon) opacity-90 mt-0.5"
        aria-hidden
      />
      <p className="text-xs text-(--color_text_muted) leading-relaxed min-w-0">{children}</p>
    </div>
  );
}
