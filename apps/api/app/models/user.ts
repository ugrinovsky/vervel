import { DateTime } from 'luxon';
import hash from '@adonisjs/core/services/hash';
import { compose } from '@adonisjs/core/helpers';
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm';
import type { HasMany } from '@adonisjs/lucid/types/relations';
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid';
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens';
import TrainerAthlete from './trainer_athlete.js';
import TrainerGroup from './trainer_group.js';

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
});

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare fullName: string | null;

  @column()
  declare email: string;

  @column({ serializeAs: null })
  declare password: string;

  @column()
  declare role: 'athlete' | 'trainer' | 'both';

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null;

  @hasMany(() => TrainerAthlete, { foreignKey: 'trainerId' })
  declare trainerAthletes: HasMany<typeof TrainerAthlete>;

  @hasMany(() => TrainerGroup, { foreignKey: 'trainerId' })
  declare trainerGroups: HasMany<typeof TrainerGroup>;

  get isTrainer(): boolean {
    return this.role === 'trainer' || this.role === 'both';
  }

  get isAthlete(): boolean {
    return this.role === 'athlete' || this.role === 'both';
  }

  static accessTokens = DbAccessTokensProvider.forModel(User);
}
