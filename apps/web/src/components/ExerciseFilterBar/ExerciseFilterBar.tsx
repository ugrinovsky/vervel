import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Input from '@/components/ui/Input';
import ChipScrollRow from '@/components/ui/ChipScrollRow';
import type { ExerciseCategory, MuscleZone } from '@/types/Exercise';
import { getZoneLabel } from '@/util/zones';
import { CATEGORY_LABELS, CATEGORY_LABELS_SHORT } from './exerciseFilterConstants';
import {
  EXERCISE_CATEGORY_CHIP_TONES,
  EXERCISE_ZONE_CHIP_TONES,
} from './exerciseChipStyles';

function categoryFromChipKey(key: string, allowed: ExerciseCategory[]): ExerciseCategory | null {
  for (const c of allowed) {
    if (c === key) return c;
  }
  return null;
}

function zoneFromChipKey(key: string, allowed: MuscleZone[]): MuscleZone | null {
  for (const z of allowed) {
    if (z === key) return z;
  }
  return null;
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
  const catChips = [
    {
      key: '__all__',
      label: 'Все',
      ...EXERCISE_CATEGORY_CHIP_TONES.__all__,
    },
    ...availableCategories.map((cat) => ({
      key: cat,
      label: categoryLabels[cat],
      ...EXERCISE_CATEGORY_CHIP_TONES[cat],
    })),
  ];

  const zoneChips = [
    {
      key: '__all__',
      label: 'Все зоны',
      ...EXERCISE_ZONE_CHIP_TONES.__all__,
    },
    ...availableZones.map((zone) => ({
      key: zone,
      label: getZoneLabel(zone),
      ...EXERCISE_ZONE_CHIP_TONES[zone],
    })),
  ];

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none z-10" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={`Поиск среди ${exerciseCount} упражнений...`}
          className="pl-9 py-2.5! bg-black/25! placeholder:text-white/30!"
        />
      </div>

      <ChipScrollRow
        colored
        edgeFade
        className="pb-0.5"
        chips={catChips}
        activeKey={categoryFilter ?? '__all__'}
        onChipClick={(key) =>
          onCategoryChange(key === '__all__' ? null : categoryFromChipKey(key, availableCategories))
        }
      />

      <ChipScrollRow
        colored
        edgeFade
        className="pb-0.5"
        chips={zoneChips}
        activeKey={zoneFilter ?? '__all__'}
        onChipClick={(key) =>
          onZoneChange(key === '__all__' ? null : zoneFromChipKey(key, availableZones))
        }
      />
    </div>
  );
}
