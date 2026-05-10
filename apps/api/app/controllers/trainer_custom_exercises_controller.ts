import type { HttpContext } from '@adonisjs/core/http'
import TrainerCustomExercise from '#models/trainer_custom_exercise'
import {
  sanitizeTrainerCustomString,
  serializeTrainerCustomExercise,
} from '#utils/trainer_custom_exercise_helpers'

export default class TrainerCustomExercisesController {
  async list({ auth, response }: HttpContext) {
    const trainer = auth.user!
    const exercises = await TrainerCustomExercise.query()
      .where('trainerId', trainer.id)
      .orderBy('name', 'asc')
    return response.ok({ success: true, data: exercises.map(serializeTrainerCustomExercise) })
  }

  async create({ auth, request, response }: HttpContext) {
    const trainer = auth.user!
    const name = sanitizeTrainerCustomString(request.input('name'), 255)
    if (!name) {
      return response.badRequest({ message: 'Название обязательно' })
    }

    const ex = await TrainerCustomExercise.create({
      trainerId: trainer.id,
      name,
      notes: sanitizeTrainerCustomString(request.input('notes'), 1000),
    })

    return response.created({ success: true, data: serializeTrainerCustomExercise(ex) })
  }

  async update({ auth, params, request, response }: HttpContext) {
    const trainer = auth.user!
    const ex = await TrainerCustomExercise.query()
      .where('id', params.id)
      .where('trainerId', trainer.id)
      .firstOrFail()

    const name = sanitizeTrainerCustomString(request.input('name'), 255)
    if (name !== null) ex.name = name

    const notes = request.input('notes')
    if (notes !== undefined) ex.notes = sanitizeTrainerCustomString(notes, 1000)

    await ex.save()
    return response.ok({ success: true, data: serializeTrainerCustomExercise(ex) })
  }

  async delete({ auth, params, response }: HttpContext) {
    const trainer = auth.user!
    const ex = await TrainerCustomExercise.query()
      .where('id', params.id)
      .where('trainerId', trainer.id)
      .firstOrFail()
    await ex.delete()
    return response.ok({ success: true })
  }
}
