import env from '#start/env'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'

export class InsufficientBalanceError extends Error {
  readonly balance: number
  readonly required: number

  constructor(balance: number, required: number) {
    super(`Недостаточно средств: баланс ${balance}₽, требуется ${required}₽`)
    this.name = 'InsufficientBalanceError'
    this.balance = balance
    this.required = required
  }
}

export class AiBalanceService {
  /** Стоимости операций из env (с дефолтами) */
  static get COST_GENERATE(): number {
    return Number(env.get('AI_COST_GENERATE', '10'))
  }

  static get COST_RECOGNIZE(): number {
    return Number(env.get('AI_COST_RECOGNIZE', '9'))
  }

  /** Парсинг заметок тренера с инъекцией каталога (2× тяжелее запрос) */
  static get COST_PARSE_NOTES(): number {
    return Number(env.get('AI_COST_PARSE_NOTES', String(this.COST_RECOGNIZE * 2)))
  }

  /** YandexGPT Lite: ₽ per 1000 input tokens */
  static get CHAT_INPUT_RATE(): number {
    return Number(env.get('AI_CHAT_INPUT_RATE', '0.20'))
  }

  /** YandexGPT Lite: ₽ per 1000 output tokens */
  static get CHAT_OUTPUT_RATE(): number {
    return Number(env.get('AI_CHAT_OUTPUT_RATE', '0.40'))
  }

  /** Markup multiplier applied on top of actual token cost */
  static get CHAT_MARKUP(): number {
    return Number(env.get('AI_CHAT_MARKUP', '5'))
  }

  /** Minimum charge per chat message regardless of token count */
  static get CHAT_MIN_CHARGE(): number {
    return Number(env.get('AI_CHAT_MIN_CHARGE', '0.50'))
  }

  /** Calculate actual chat cost from token usage, apply markup, enforce minimum */
  static calculateChatCost(inputTokens: number, outputTokens: number): number {
    const raw =
      (inputTokens / 1000) * this.CHAT_INPUT_RATE * this.CHAT_MARKUP +
      (outputTokens / 1000) * this.CHAT_OUTPUT_RATE * this.CHAT_MARKUP
    return Math.max(Math.round(raw * 100) / 100, this.CHAT_MIN_CHARGE)
  }

  static get WELCOME_BONUS(): number {
    return Number(env.get('AI_WELCOME_BONUS', '50'))
  }

  /**
   * Списывает средства с баланса пользователя.
   * Выполняется в транзакции БД для корректности.
   * Бросает InsufficientBalanceError если средств недостаточно.
   * @returns новый баланс
   */
  static async charge(userId: number, amount: number, description: string): Promise<number> {
    return await db.transaction(async (trx) => {
      const user = await User.query({ client: trx })
        .where('id', userId)
        .forUpdate()
        .firstOrFail()

      if (user.balance < amount) {
        throw new InsufficientBalanceError(user.balance, amount)
      }

      const balanceBefore = user.balance
      user.balance = Math.round((balanceBefore - amount) * 100) / 100
      user.useTransaction(trx)
      await user.save()

      await trx.table('balance_transactions').insert({
        user_id: userId,
        amount: -amount,
        balance_after: user.balance,
        type: 'charge',
        description,
        created_at: new Date(),
      })

      return user.balance
    })
  }

  /** Сумма реферального бонуса */
  static readonly REFERRAL_BONUS = 50

  /**
   * Начисляет средства на баланс пользователя (бонус/пополнение).
   * @returns новый баланс
   */
  static async topup(userId: number, amount: number, type: 'topup' | 'bonus', description: string): Promise<number> {
    return await db.transaction(async (trx) => {
      const user = await User.query({ client: trx })
        .where('id', userId)
        .forUpdate()
        .firstOrFail()

      user.balance = Math.round((user.balance + amount) * 100) / 100
      user.useTransaction(trx)
      await user.save()

      await trx.table('balance_transactions').insert({
        user_id: userId,
        amount,
        balance_after: user.balance,
        type,
        description,
        created_at: new Date(),
      })

      return user.balance
    })
  }

  /**
   * Возвращает текущий баланс пользователя.
   */
  static async getBalance(userId: number): Promise<number> {
    const user = await User.findOrFail(userId)
    return user.balance
  }

  /**
   * Возвращает последние транзакции пользователя.
   */
  static async getTransactions(
    userId: number,
    limit = 20,
    offset = 0
  ): Promise<
    Array<{
      id: number
      amount: number
      balanceAfter: number
      type: string
      description: string
      createdAt: string
    }>
  > {
    const rows = await db
      .from('balance_transactions')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)

    return rows.map((r) => ({
      id: r.id,
      amount: r.amount,
      balanceAfter: r.balance_after,
      type: r.type,
      description: r.description,
      createdAt: r.created_at,
    }))
  }
}
