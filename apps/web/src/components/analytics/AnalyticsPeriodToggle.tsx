import Tabs from '@/components/ui/Tabs';

export type AnalyticsPeriod = 'week' | 'month' | 'year';

const TABS: { id: AnalyticsPeriod; label: string }[] = [
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'year', label: 'Год' },
];

type Props = {
  value: AnalyticsPeriod;
  onChange: (p: AnalyticsPeriod) => void;
  className?: string;
  /** Подсказка про смысл периодов (например, на экране атлета — да, у тренера — нет) */
  showHint?: boolean;
};

/**
 * Карточка периода аналитики: общий {@link Tabs} в режиме `embedded` + опциональная подсказка.
 */
export default function AnalyticsPeriodToggle({
  value,
  onChange,
  className = '',
  showHint = true,
}: Props) {
  return (
    <div
      className={`
        rounded-2xl border border-(--color_border) bg-(--color_bg_card) backdrop-blur-md
        shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden
        ${className}
      `}
    >
      <Tabs<AnalyticsPeriod>
        tabs={TABS}
        active={value}
        onChange={onChange}
        embedded
        ariaLabel="Период аналитики"
      />

      {showHint && (
        <>
          <div className="h-px bg-(--color_border) mx-3 opacity-80" />
          <div className="px-3.5 pt-3 pb-3.5 flex gap-2.5">
            <span className="text-base leading-none shrink-0 mt-0.5" aria-hidden>
              💡
            </span>
            <p className="text-xs text-(--color_text_muted) leading-relaxed min-w-0">
              <span className="text-white font-medium">Неделя</span> — оперативный контроль нагрузки.
              <br />
              <span className="text-white font-medium">Месяц</span> — видите тренды и объём работы.
              <br />
              <span className="text-white font-medium">Год</span> — оцениваете долгосрочный прогресс и
              периодизацию.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
