import { useRef, useCallback, useLayoutEffect, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import AppInput from '@/components/ui/AppInput';
import type { ExerciseCategory, MuscleZone } from '@/types/Exercise';
import { getZoneLabel } from '@/util/zones';

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  strength: 'Силовые',
  olympic: 'Олимпийские',
  gymnastics: 'Гимнастика',
  functional: 'Функциональные',
  cardio: 'Кардио',
};

export const CATEGORY_LABELS_SHORT: Record<ExerciseCategory, string> = {
  strength: 'Силовые',
  olympic: 'Олимп.',
  gymnastics: 'Гимнастика',
  functional: 'Функц.',
  cardio: 'Кардио',
};

function makeMask(atStart: boolean, atEnd: boolean): string {
  if (atStart && atEnd) return 'none';
  if (atStart) return 'linear-gradient(to right, black calc(100% - 32px), transparent 100%)';
  if (atEnd) return 'linear-gradient(to right, transparent 0px, black 32px)';
  return 'linear-gradient(to right, transparent 0px, black 32px, black calc(100% - 32px), transparent 100%)';
}

function useScrollMask() {
  const ref = useRef<HTMLDivElement>(null);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const atStart = el.scrollLeft <= 2;
    const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2;
    const mask = makeMask(atStart, atEnd);
    el.style.maskImage = mask;
    (el.style as any).webkitMaskImage = mask;
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
      mo.disconnect();
    };
  }, [update]);

  return ref;
}

/* ------------------------------------------------------------------ */
/* ChipRow — pill positioned via offsetLeft (parent-relative, not     */
/* viewport-relative), so page scroll doesn't affect the animation    */
/* ------------------------------------------------------------------ */

interface ChipItem {
  key: string;
  label: string;
}

function ChipRow({
  chips,
  activeKey,
  onChipClick,
}: {
  chips: ChipItem[];
  activeKey: string | null;
  onChipClick: (key: string) => void;
}) {
  const rowRef = useScrollMask();
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const activeBtn = btnRefs.current.get(activeKey ?? '__none__');
    if (!activeBtn) {
      setPill(null);
      return;
    }
    setPill({ left: activeBtn.offsetLeft, width: activeBtn.offsetWidth });
  }, [activeKey, chips]);

  useEffect(() => {
    const activeBtn = btnRefs.current.get(activeKey ?? '__none__');
    activeBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeKey]);

  return (
    <div ref={rowRef} className="relative flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
      {pill && (
        <motion.div
          className="absolute top-0 bottom-0.5 rounded-full bg-(--color_primary_light) pointer-events-none"
          initial={{ left: pill.left, width: pill.width }}
          animate={{ left: pill.left, width: pill.width }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        />
      )}

      {chips.map(({ key, label }) => (
        <button
          key={key}
          ref={(el) => {
            if (el) btnRefs.current.set(key, el);
            else btnRefs.current.delete(key);
          }}
          onClick={() => onChipClick(key)}
          className={`relative shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border outline-none z-10 transition-colors ${
            activeKey === key
              ? 'text-[white] border-transparent'
              : 'bg-black/25 text-[white] border-white/10 hover:bg-black/35 hover:border-white/20'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface Props {
  exerciseCount: number;
  search: string;
  onSearchChange: (v: string) => void;
  categoryFilter: ExerciseCategory | null;
  onCategoryChange: (v: ExerciseCategory | null) => void;
  availableCategories: ExerciseCategory[];
  zoneFilter: MuscleZone | null;
  onZoneChange: (v: MuscleZone | null) => void;
  availableZones: MuscleZone[];
  categoryLabels?: Record<ExerciseCategory, string>;
}

export default function ExerciseFilterBar({
  exerciseCount,
  search,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  availableCategories,
  zoneFilter,
  onZoneChange,
  availableZones,
  categoryLabels = CATEGORY_LABELS,
}: Props) {
  const catChips: ChipItem[] = [
    { key: '__all__', label: 'Все' },
    ...availableCategories.map((cat) => ({ key: cat, label: categoryLabels[cat] })),
  ];

  const zoneChips: ChipItem[] = [
    { key: '__all__', label: 'Все зоны' },
    ...availableZones.map((zone) => ({ key: zone, label: getZoneLabel(zone) })),
  ];

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none z-10" />
        <AppInput
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={`Поиск среди ${exerciseCount} упражнений...`}
          className="pl-9 py-2.5! bg-black/25! placeholder:text-white/30!"
        />
      </div>

      <ChipRow
        chips={catChips}
        activeKey={categoryFilter ?? '__all__'}
        onChipClick={(key) => onCategoryChange(key === '__all__' ? null : (key as ExerciseCategory))}
      />

      <ChipRow
        chips={zoneChips}
        activeKey={zoneFilter ?? '__all__'}
        onChipClick={(key) => onZoneChange(key === '__all__' ? null : (key as MuscleZone))}
      />
    </div>
  );
}
