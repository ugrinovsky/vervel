import ToggleGroup from '@/components/ui/ToggleGroup';
import { WORKOUT_TYPE_CONFIG } from '@/constants/workoutTypes';

export type WorkoutType = 'crossfit' | 'bodybuilding' | 'cardio';

interface Props {
  value: WorkoutType | null;
  onChange: (type: WorkoutType) => void;
}

const OPTIONS = (['bodybuilding', 'crossfit', 'cardio'] as const).map((type) => ({
  value: type,
  label: WORKOUT_TYPE_CONFIG[type],
}));

export default function WorkoutTypeTabs({ value, onChange }: Props) {
  return (
    <ToggleGroup
      cols={3}
      value={value}
      onChange={onChange}
      options={OPTIONS}
      itemPy="py-2.5"
    />
  );
}
