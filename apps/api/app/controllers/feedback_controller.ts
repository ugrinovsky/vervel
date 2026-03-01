import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import db from '@adonisjs/lucid/services/db'

const feedbackValidator = vine.compile(
  vine.object({
    type: vine.enum(['general', 'bug', 'feature', 'other'] as const),
    message: vine.string().trim().minLength(5).maxLength(2000),
    contact: vine.string().trim().maxLength(255).optional(),
  })
)

export default class FeedbackController {
  async create({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(feedbackValidator)

    await db.table('feedbacks').insert({
      user_id: auth.user?.id ?? null,
      type: data.type,
      message: data.message,
      contact: data.contact ?? null,
      is_processed: false,
      created_at: new Date(),
      updated_at: new Date(),
    })

    return response.created({ success: true, message: 'Спасибо за отзыв!' })
  }
}
