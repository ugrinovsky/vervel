import { DateTime } from 'luxon';
import hash from '@adonisjs/core/services/hash';
import { compose } from '@adonisjs/core/helpers';
import { BaseModel, column, hasMany, hasOne } from '@adonisjs/lucid/orm';
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations';
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid';
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens';
import TrainerAthlete from './trainer_athlete.js';
import TrainerGroup from './trainer_group.js';
import UserStreak from './user_streak.js';
import UserAchievement from './user_achievement.js';
import OAuthProvider from './oauth_provider.js';
import Chat from './chat.js';
import Message from './message.js';
import ScheduledWorkout from './scheduled_workout.js';
import WorkoutTemplate from './workout_template.js';

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
  declare password: string | null;

  @column()
  declare role: 'athlete' | 'trainer' | 'both';

  @column()
  declare bio: string | null;

  @column()
  declare specializations: string[] | null;

  @column()
  declare education: string | null;

  @column()
  declare photoUrl: string | null;

  @column()
  declare gender: 'male' | 'female' | null;

  /** Wallet balance in rubles — used for AI features, donations to trainers, etc. */
  @column()
  declare balance: number;

  /** Theme hue (0–359) — persisted per account so theme follows the user across devices. */
  @column()
  declare themeHue: number | null;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null;

  @hasMany(() => TrainerAthlete, { foreignKey: 'trainerId' })
  declare trainerAthletes: HasMany<typeof TrainerAthlete>;

  @hasMany(() => TrainerGroup, { foreignKey: 'trainerId' })
  declare trainerGroups: HasMany<typeof TrainerGroup>;

  @hasOne(() => UserStreak)
  declare streak: HasOne<typeof UserStreak>;

  @hasMany(() => UserAchievement)
  declare achievements: HasMany<typeof UserAchievement>;

  @hasMany(() => OAuthProvider)
  declare oauthProviders: HasMany<typeof OAuthProvider>;

  @hasMany(() => Chat, { foreignKey: 'trainerId' })
  declare chats: HasMany<typeof Chat>;

  @hasMany(() => Message, { foreignKey: 'senderId' })
  declare sentMessages: HasMany<typeof Message>;

  @hasMany(() => ScheduledWorkout, { foreignKey: 'trainerId' })
  declare scheduledWorkouts: HasMany<typeof ScheduledWorkout>;

  @hasMany(() => WorkoutTemplate, { foreignKey: 'trainerId' })
  declare workoutTemplates: HasMany<typeof WorkoutTemplate>;

  get isTrainer(): boolean {
    return this.role === 'trainer' || this.role === 'both';
  }

  get isAthlete(): boolean {
    return this.role === 'athlete' || this.role === 'both';
  }

  static accessTokens = DbAccessTokensProvider.forModel(User);
}
