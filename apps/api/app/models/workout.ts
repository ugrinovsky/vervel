import { DateTime } from 'luxon';
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import User from './user.js';

/**
 * Атомарная единица нагрузки
 */
export type WorkoutSet = {
  id: string;

  // силовые
  reps?: number;
  weight?: number;

  // кардио
  time?: number; // в секундах
  distance?: number; // в метрах
  calories?: number;

  // доп
  rpe?: number;
};

/**
 * Упражнение внутри тренировки
 */
export type WorkoutExercise = {
  exerciseId: string;

  /**
   * Тип упражнения
   */
  type: 'strength' | 'cardio' | 'wod';

  /**
   * Сеты (для силовых и кардио)
   */
  sets?: WorkoutSet[];

  /**
   * Формат WOD
   */
  wodType?: 'amrap' | 'fortime' | 'emom' | 'tabata';

  /**
   * Для AMRAP / EMOM
   */
  duration?: number; // в секундах

  /**
   * Для For Time
   */
  rounds?: number;
};

export default class Workout extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare userId: number;

  @column.dateTime({ autoCreate: true })
  declare date: DateTime;

  @column()
  declare workoutType: 'crossfit' | 'bodybuilding' | 'cardio';

  @column({
    prepare: (value) => JSON.stringify(value),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare exercises: WorkoutExercise[];

  @column({
    prepare: (value) => JSON.stringify(value),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare zonesLoad: Record<string, number>;

  @column()
  declare totalIntensity: number;

  @column()
  declare totalVolume: number;

  @column()
  declare notes: string;

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;
}
