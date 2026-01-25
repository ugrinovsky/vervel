import { WorkoutExercise } from './WorkoutExercise';

export interface Workout {
  _id?: string;

  userId: string;
  date: string; // YYYY-MM-DD

  /** Сырые строки (ручной ввод или OCR) */
  rawText?: string;

  /** Структурированные упражнения */
  exercises: WorkoutExercise[];

  createdAt: Date;
}
