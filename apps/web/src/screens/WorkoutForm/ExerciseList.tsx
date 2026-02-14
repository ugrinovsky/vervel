import type { ExerciseWithSets } from '@/types/Exercise';

interface Props {
  exercises: ExerciseWithSets[];
  setExercises: (ex: ExerciseWithSets[]) => void;
}

export default function ExerciseList({ exercises, setExercises }: Props) {
  return (
    <div className="mt-4 space-y-3">
      {exercises.map((ex, i) => (
        <div key={i} className="p-3 bg-white/5 border border-white/10 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium">{ex.title}</span>
            <button
              onClick={() => setExercises(exercises.filter((_, idx) => idx !== i))}
              className="text-red-400 text-sm hover:text-red-300"
            >
              Удалить
            </button>
          </div>
          <div className="text-xs text-white/60 mt-1">{ex.sets.length} подходов</div>
        </div>
      ))}
    </div>
  );
}
