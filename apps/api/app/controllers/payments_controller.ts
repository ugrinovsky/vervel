import type { HttpContext } from '@adonisjs/core/http'
import crypto from 'node:crypto'
import vine from '@vinejs/vine'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import limiter from '@adonisjs/limiter/services/main'
import env from '#start/env'
import User from '#models/user'
import { isRecord } from '#utils/type_guards'

interface YookassaPayment {
  id: string
  status: string
  confirmation: { confirmation_url: string }
}

function parseYookassaPayment(raw: unknown): YookassaPayment {
  if (!isRecord(raw)) throw new Error('Invalid YooKassa payment response')
  const conf = isRecord(raw.confirmation) ? raw.confirmation : {}
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    status: typeof raw.status === 'string' ? raw.status : '',
    confirmation: {
      confirmation_url: typeof conf.confirmation_url === 'string' ? conf.confirmation_url : '',
    },
  }
}

const YOOKASSA_API = 'https://api.yookassa.ru/v3/payments'

/**
 * IP ranges officially published by YooKassa for webhook delivery.
 * https://yookassa.ru/developers/using-api/webhooks
 */
const YOOKASSA_IP_RANGES = [
  '185.71.76.', // 185.71.76.0/27
  '185.71.77.', // 185.71.77.0/27
  '77.75.153.', // 77.75.153.0/25
  '77.75.156.11',
  '77.75.156.35',
]

const ALLOWED_AMOUNTS = [100, 250, 500, 1000]

const topupValidator = vine.compile(
  vine.object({
    amount: vine.number().in(ALLOWED_AMOUNTS),
  })
)

function isYookassaIp(ip: string): boolean {
  return YOOKASSA_IP_RANGES.some((range) => ip.startsWith(range))
}

function parseAmountValue(v: unknown): number | null {
  if (typeof v !== 'string') return null
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

type YookassaPaymentDetails = {
  id: string
  status: string
  amount: { value: string; currency: string } | null
  metadata: { user_id?: string } | null
}

function parseYookassaPaymentDetails(raw: unknown): YookassaPaymentDetails {
  if (!isRecord(raw)) throw new Error('Invalid YooKassa payment details')
  const amount = isRecord(raw.amount) ? raw.amount : null
  const metadata = isRecord(raw.metadata) ? raw.metadata : null
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    status: typeof raw.status === 'string' ? raw.status : '',
    amount:
      amount && typeof amount.value === 'string' && typeof amount.currency === 'string'
        ? { value: amount.value, currency: amount.currency }
        : null,
    metadata: metadata ? metadata : null,
  }
}

async function fetchPaymentDetailsFromYookassa(
  paymentId: string
): Promise<YookassaPaymentDetails | null> {
  const shopId = env.get('YOOKASSA_SHOP_ID')
  const secretKey = env.get('YOOKASSA_SECRET_KEY')
  if (!shopId || !secretKey) return null

  const url = `${YOOKASSA_API}/${encodeURIComponent(paymentId)}`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${btoa(`${shopId}:${secretKey}`)}`,
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    logger.error(
      { status: res.status, body: text.length > 500 ? `${text.slice(0, 500)}…` : text },
      'yookassa: fetch payment failed'
    )
    return null
  }
  return parseYookassaPaymentDetails(await res.json())
}

export default class PaymentsController {
  /**
   * POST /payments/topup
   * Создаёт платёж ЮКасса и возвращает ссылку для оплаты.
   */
  async topup({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(topupValidator)

    const shopId = env.get('YOOKASSA_SHOP_ID')
    const secretKey = env.get('YOOKASSA_SECRET_KEY')
    if (!shopId || !secretKey) {
      return response.serviceUnavailable({ message: 'Платежи временно недоступны' })
    }
    const userId = auth.user!.id
    const idempotencyKey = crypto.randomUUID()
    const appUrl = env.get('APP_URL', 'http://localhost:5173')

    const yookassaBody = {
      amount: {
        value: data.amount.toFixed(2),
        currency: 'RUB',
      },
      confirmation: {
        type: 'redirect',
        return_url: `${appUrl}/profile?topup=success`,
      },
      description: 'Пополнение кошелька Vervel',
      metadata: {
        user_id: String(userId),
        amount: String(data.amount),
      },
      capture: true,
    }

    let yookassaRes: Response
    try {
      yookassaRes = await fetch(YOOKASSA_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${shopId}:${secretKey}`)}`,
          'Idempotence-Key': idempotencyKey,
        },
        body: JSON.stringify(yookassaBody),
      })
    } catch (err) {
      return response.internalServerError({ message: 'Ошибка подключения к платёжному сервису' })
    }

    if (!yookassaRes.ok) {
      const errText = await yookassaRes.text()
      logger.error({ status: yookassaRes.status, body: errText }, 'yookassa: create payment failed')
      return response.internalServerError({ message: 'Ошибка создания платежа' })
    }

    const payment = parseYookassaPayment(await yookassaRes.json())

    // Save payment record to DB
    await db.table('payments').insert({
      user_id: userId,
      yookassa_payment_id: payment.id,
      amount: data.amount,
      status: 'pending',
      idempotency_key: idempotencyKey,
      created_at: new Date(),
      updated_at: new Date(),
    })

    return response.ok({ confirmationUrl: payment.confirmation.confirmation_url })
  }

  /**
   * POST /payments/webhook
   * Публичный endpoint — принимает события от ЮКасса.
   * Проверяет IP, начисляет баланс при payment.succeeded.
   */
  async webhook({ request, response }: HttpContext) {
    // Basic load protection. Not a security boundary (security is: IP allowlist + verify via API).
    const ip = request.ip()
    const webhookLimit = limiter.use({ requests: 600, duration: '5 mins', blockDuration: '5 mins' })
    const limRes = await webhookLimit.attempt(`yookassa_webhook_ip_${ip}`, async () => true)
    if (limRes === null) {
      return response.tooManyRequests({ message: 'Too many requests' })
    }

    const skipIpCheck = env.get('YOOKASSA_SKIP_IP_CHECK', 'false') === 'true'

    if (!skipIpCheck) {
      if (!isYookassaIp(ip)) {
        logger.warn({ ip }, 'yookassa: webhook from unknown ip')
        return response.forbidden({ message: 'Forbidden' })
      }
    }

    const body = request.body() as {
      event?: string
      object?: {
        id?: string
        status?: string
        amount?: { value?: string }
        metadata?: { user_id?: string; amount?: string }
      }
    }

    const event = body?.event
    const paymentObj = body?.object

    if (!event || !paymentObj?.id) {
      return response.badRequest({ message: 'Invalid payload' })
    }

    const yookassaPaymentId = paymentObj.id

    if (event === 'payment.succeeded') {
      const paymentRow = await db
        .from('payments')
        .where('yookassa_payment_id', yookassaPaymentId)
        .first()

      if (!paymentRow) {
        logger.warn({ yookassaPaymentId }, 'yookassa: webhook for unknown payment')
        return response.ok({})
      }
      if (paymentRow.status === 'succeeded') {
        return response.ok({})
      }

      const expectedAmount = Math.round(Number(paymentRow.amount) * 100) / 100
      const expectedUserId = Number(paymentRow.user_id)

      const verifyApi = env.get('YOOKASSA_VERIFY_API', 'true') !== 'false'
      if (verifyApi) {
        const details = await fetchPaymentDetailsFromYookassa(yookassaPaymentId)
        if (!details || details.id !== yookassaPaymentId) {
          logger.warn({ yookassaPaymentId }, 'yookassa: cannot verify payment via api')
          return response.ok({})
        }
        if (details.status !== 'succeeded') {
          logger.warn(
            { yookassaPaymentId, status: details.status },
            'yookassa: payment not succeeded'
          )
          return response.ok({})
        }
        const amountFromApi = parseAmountValue(details.amount?.value)
        if (amountFromApi === null || amountFromApi !== expectedAmount) {
          logger.warn(
            { yookassaPaymentId, amountFromApi, expectedAmount },
            'yookassa: amount mismatch (api)'
          )
          return response.ok({})
        }
        const userIdFromApi = Number(details.metadata?.user_id ?? Number.NaN)
        if (!Number.isFinite(userIdFromApi) || userIdFromApi !== expectedUserId) {
          logger.warn(
            { yookassaPaymentId, userIdFromApi, expectedUserId },
            'yookassa: metadata user mismatch (api)'
          )
          return response.ok({})
        }
      }

      await db.transaction(async (trx) => {
        const locked = await trx
          .from('payments')
          .where('yookassa_payment_id', yookassaPaymentId)
          .forUpdate()
          .first()
        if (!locked) return
        if (locked.status === 'succeeded') return

        await trx
          .from('payments')
          .where('yookassa_payment_id', yookassaPaymentId)
          .update({ status: 'succeeded', updated_at: new Date() })

        const user = await User.query({ client: trx })
          .where('id', expectedUserId)
          .forUpdate()
          .firstOrFail()

        user.balance = Math.round((user.balance + expectedAmount) * 100) / 100
        user.useTransaction(trx)
        await user.save()

        await trx.table('balance_transactions').insert({
          user_id: expectedUserId,
          amount: expectedAmount,
          balance_after: user.balance,
          type: 'topup',
          description: `Пополнение через ЮКасса (${expectedAmount}₽)`,
          created_at: new Date(),
        })
      })
    } else if (event === 'payment.canceled') {
      await db.transaction(async (trx) => {
        const paymentRow = await trx
          .from('payments')
          .where('yookassa_payment_id', yookassaPaymentId)
          .forUpdate()
          .first()
        if (!paymentRow) return
        if (paymentRow.status === 'succeeded') return
        await trx
          .from('payments')
          .where('yookassa_payment_id', yookassaPaymentId)
          .update({ status: 'canceled', updated_at: new Date() })
      })
    }

    return response.ok({})
  }
}
