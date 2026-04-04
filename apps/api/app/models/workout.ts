import { DateTime } from 'luxon';
import { compose } from '@adonisjs/core/helpers';
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm';
import { SoftDeletes } from 'adonis-lucid-soft-deletes';
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

  /** Отображаемое название — от AI или пользователя; приоритет над каталогом при показе */
  name?: string;

  /** Зоны мышц, предоставленные AI (используются если упражнение не в каталоге) */
  zones?: string[];

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

  /**
   * Если упражнение часть суперсета — одинаковая метка у группы (напр. "A", "B")
   */
  supersetGroup?: string;
};

export default class Workout extends compose(BaseModel, SoftDeletes) {
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
    consume: (value) => {
      if (typeof value !== 'string') return value
      try { return JSON.parse(value) } catch { return [] }
    },
  })
  declare exercises: WorkoutExercise[];

  @column({
    prepare: (value) => JSON.stringify(value),
    consume: (value) => {
      if (typeof value !== 'string') return value
      try { return JSON.parse(value) } catch { return {} }
    },
  })
  declare zonesLoad: Record<string, number>;

  @column()
  declare totalIntensity: number;

  @column()
  declare totalVolume: number;

  @column()
  declare notes: string;

  @column()
  declare rpe: number | null;

  @column()
  declare scheduledWorkoutId: number | null;

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;
}
