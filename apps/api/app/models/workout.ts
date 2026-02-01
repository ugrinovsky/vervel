import { DateTime } from 'luxon';
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import User from './user.js';

export default class Workout extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare userId: number;

  @column.dateTime({ autoCreate: true })
  declare date: DateTime;

  @column()
  declare workoutType: 'crossfit' | 'bodybuilding' | 'mixed';

  @column({
    prepare: (value) => JSON.stringify(value),
  })
  declare exercises: Array<{
    exerciseId: string;
    sets?: number;
    reps?: number;
    weight?: number;
    rounds?: number;
    time?: number;
    wodType?: string;
  }>;

  @column({
    prepare: (value) => JSON.stringify(value),
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
