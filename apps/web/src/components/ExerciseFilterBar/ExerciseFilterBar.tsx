import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import AppInput from '@/components/ui/AppInput';
import ChipScrollRow from '@/components/ui/ChipScrollRow';
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
  const catChips = [
    { key: '__all__', label: 'Все' },
    ...availableCategories.map((cat) => ({ key: cat, label: categoryLabels[cat] })),
  ];

  const zoneChips = [
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

      <ChipScrollRow
        className="pb-0.5"
        chips={catChips}
        activeKey={categoryFilter ?? '__all__'}
        onChipClick={(key) => onCategoryChange(key === '__all__' ? null : (key as ExerciseCategory))}
      />

      <ChipScrollRow
        className="pb-0.5"
        chips={zoneChips}
        activeKey={zoneFilter ?? '__all__'}
        onChipClick={(key) => onZoneChange(key === '__all__' ? null : (key as MuscleZone))}
      />
    </div>
  );
}
