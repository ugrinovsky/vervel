import { useRef, useCallback, useLayoutEffect, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
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

function FilterChip({ label, active, onClick, layoutId }: { label: string; active: boolean; onClick: () => void; layoutId: string }) {
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (active) {
      btnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [active]);

  return (
    <button
      ref={btnRef}
      onClick={onClick}
      className={`relative shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border outline-none ${
        active
          ? 'text-[white] border-transparent'
          : 'bg-black/25 text-[white] border-white/10 hover:bg-black/35 hover:border-white/20'
      }`}
    >
      {active && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-full bg-(--color_primary_light)"
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </button>
  );
}

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
  const catRef = useScrollMask();
  const zoneRef = useScrollMask();

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={`Поиск среди ${exerciseCount} упражнений...`}
          className="w-full bg-(--color_bg_card) border border-(--color_border) rounded-xl pl-9 pr-3 py-2.5 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors placeholder:text-white/30"
        />
      </div>

      <motion.div layoutRoot ref={catRef} className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
        <FilterChip label="Все" active={!categoryFilter} onClick={() => onCategoryChange(null)} layoutId="filter-cat" />
        {availableCategories.map((cat) => (
          <FilterChip
            key={cat}
            label={categoryLabels[cat]}
            active={categoryFilter === cat}
            onClick={() => onCategoryChange(categoryFilter === cat ? null : cat)}
            layoutId="filter-cat"
          />
        ))}
      </motion.div>

      <motion.div layoutRoot ref={zoneRef} className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
        <FilterChip label="Все зоны" active={!zoneFilter} onClick={() => onZoneChange(null)} layoutId="filter-zone" />
        {availableZones.map((zone) => (
          <FilterChip
            key={zone}
            label={getZoneLabel(zone)}
            active={zoneFilter === zone}
            onClick={() => onZoneChange(zoneFilter === zone ? null : zone)}
            layoutId="filter-zone"
          />
        ))}
      </motion.div>
    </div>
  );
}
