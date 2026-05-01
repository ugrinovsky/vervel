import type { ExerciseData } from '@/api/trainer';
import { isRecord } from '@/utils/typeGuards';
import { isWodType } from '@/constants/workoutTypes';

function exerciseDataFromUnknown(el: unknown): ExerciseData {
  if (!isRecord(el)) return { name: '' };
  const wodRaw = el.wodType;
  const wodType =
    typeof wodRaw === 'string' && isWodType(wodRaw) ? wodRaw : undefined;
  return {
    exerciseId: typeof el.exerciseId === 'string' ? el.exerciseId : undefined,
    name: typeof el.name === 'string' ? el.name : '',
    sets: typeof el.sets === 'number' ? el.sets : undefined,
    reps: typeof el.reps === 'number' ? el.reps : undefined,
    weight: typeof el.weight === 'number' ? el.weight : undefined,
    duration: typeof el.duration === 'number' ? el.duration : undefined,
    distance: typeof el.distance === 'number' ? el.distance : undefined,
    bodyweight: typeof el.bodyweight === 'boolean' ? el.bodyweight : undefined,
    wodType,
    timeCap: typeof el.timeCap === 'number' ? el.timeCap : undefined,
    rounds: typeof el.rounds === 'number' ? el.rounds : undefined,
    blockId: typeof el.blockId === 'string' ? el.blockId : undefined,
  };
}

export type AthleteWorkoutDraft = {
  workoutType: string;
  exercises: ExerciseData[];
  notes: string;
  date: string;
};

export function parseAthleteWorkoutDraft(raw: string): AthleteWorkoutDraft | null {
  try {
    const v: unknown = JSON.parse(raw);
    if (!isRecord(v)) return null;
    if (typeof v.workoutType !== 'string' || typeof v.notes !== 'string' || typeof v.date !== 'string') {
      return null;
    }
    if (!Array.isArray(v.exercises)) return null;
    const exercises = v.exercises.map(exerciseDataFromUnknown);
    if (!exercises.length && !v.notes) return null;
    return { workoutType: v.workoutType, exercises, notes: v.notes, date: v.date };
  } catch {
    return null;
  }
}

export type TrainerWorkoutDraft = AthleteWorkoutDraft & { time: string };

export function parseTrainerWorkoutDraft(raw: string): TrainerWorkoutDraft | null {
  try {
    const v: unknown = JSON.parse(raw);
    if (!isRecord(v)) return null;
    if (typeof v.workoutType !== 'string' || typeof v.notes !== 'string' || typeof v.date !== 'string') {
      return null;
    }
    if (typeof v.time !== 'string') return null;
    if (!Array.isArray(v.exercises)) return null;
    const exercises = v.exercises.map(exerciseDataFromUnknown);
    if (!exercises.length && !v.notes) return null;
    return { workoutType: v.workoutType, exercises, notes: v.notes, date: v.date, time: v.time };
  } catch {
    return null;
  }
}
