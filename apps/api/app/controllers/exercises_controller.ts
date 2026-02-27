import type { HttpContext } from '@adonisjs/core/http'
import { ExerciseCatalog } from '#services/ExerciseCatalog'

export default class ExercisesController {
  /** GET /exercises — лёгкий список для пикера (без инструкций) */
  public async index({}: HttpContext) {
    return ExerciseCatalog.all()
  }

  /** GET /exercises/:id — полные данные (инструкции + все изображения) */
  public async show({ params, response }: HttpContext) {
    const exercise = ExerciseCatalog.findFull(params.id)
    if (!exercise) {
      return response.notFound({ message: 'Упражнение не найдено' })
    }
    return exercise
  }
}
