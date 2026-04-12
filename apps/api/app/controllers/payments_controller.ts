import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import User from '#models/user'

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

export default class PaymentsController {
  /**
   * POST /payments/topup
   * Создаёт платёж ЮКасса и возвращает ссылку для оплаты.
   */
  async topup({ auth, request, response }: HttpContext) {
    const shopId = env.get('YOOKASSA_SHOP_ID')
    const secretKey = env.get('YOOKASSA_SECRET_KEY')

    if (!shopId || !secretKey) {
      return response.serviceUnavailable({ message: 'Платежи временно недоступны' })
    }

    const data = await request.validateUsing(topupValidator)
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
    } catch (err: any) {
      return response.internalServerError({ message: 'Ошибка подключения к платёжному сервису' })
    }

    if (!yookassaRes.ok) {
      const errText = await yookassaRes.text()
      console.error('YooKassa error:', yookassaRes.status, errText)
      return response.internalServerError({ message: 'Ошибка создания платежа' })
    }

    const payment = (await yookassaRes.json()) as {
      id: string
      status: string
      confirmation: { confirmation_url: string }
    }

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
    const skipIpCheck = env.get('YOOKASSA_SKIP_IP_CHECK', 'false') === 'true'

    if (!skipIpCheck) {
      const ip = request.ip()
      if (!isYookassaIp(ip)) {
        console.warn(`Webhook from unknown IP: ${ip}`)
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
        // Unknown payment — log and ignore
        console.warn('Webhook for unknown payment:', yookassaPaymentId)
        return response.ok({})
      }

      // Idempotency: already processed
      if (paymentRow.status === 'succeeded') {
        return response.ok({})
      }

      const amount = Number(paymentRow.amount)
      const userId = paymentRow.user_id

      await db.transaction(async (trx) => {
        // Mark payment as succeeded
        await trx
          .from('payments')
          .where('yookassa_payment_id', yookassaPaymentId)
          .update({ status: 'succeeded', updated_at: new Date() })

        // Credit user balance
        const user = await User.query({ client: trx }).where('id', userId).forUpdate().firstOrFail()

        user.balance = Math.round((user.balance + amount) * 100) / 100
        user.useTransaction(trx)
        await user.save()

        // Record in balance_transactions
        await trx.table('balance_transactions').insert({
          user_id: userId,
          amount: amount,
          balance_after: user.balance,
          type: 'topup',
          description: `Пополнение через ЮКасса (${amount}₽)`,
          created_at: new Date(),
        })
      })
    } else if (event === 'payment.canceled') {
      await db
        .from('payments')
        .where('yookassa_payment_id', yookassaPaymentId)
        .update({ status: 'canceled', updated_at: new Date() })
    }

    return response.ok({})
  }
}
