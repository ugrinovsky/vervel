import { WORKOUT_TYPE_CONFIG } from '@/constants/workoutTypes';

export type WorkoutType = 'crossfit' | 'bodybuilding' | 'cardio';

interface Props {
  value: WorkoutType;
  onChange: (type: WorkoutType) => void;
}

export default function WorkoutTypeTabs({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {(['crossfit', 'bodybuilding', 'cardio'] as const).map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-colors ${
            value === type
              ? 'bg-(--color_primary_light) text-white'
              : 'bg-(--color_bg_card_hover) text-(--color_text_muted) hover:text-white border border-(--color_border)'
          }`}
        >
          {WORKOUT_TYPE_CONFIG[type]}
        </button>
      ))}
    </div>
  );
}
