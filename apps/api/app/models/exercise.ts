import { DateTime } from 'luxon';
import { BaseModel, column } from '@adonisjs/lucid/orm';

export default class Exercise extends BaseModel {
  public static selfAssignPrimaryKey = true;

  @column({ isPrimary: true })
  declare id: string;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @column()
  declare title: string;

  @column()
  declare category: 'strength' | 'olympic' | 'gymnastics' | 'functional' | 'cardio';

  @column({ serializeAs: 'keywords', prepare: (value: string[]) => JSON.stringify(value) })
  declare keywords: string[];

  @column({ serializeAs: 'zones', prepare: (value: string[]) => JSON.stringify(value) })
  declare zones: string[];

  @column()
  declare intensity: number;
}
