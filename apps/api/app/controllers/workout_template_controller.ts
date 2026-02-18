import type { HttpContext } from '@adonisjs/core/http'
import WorkoutTemplate from '#models/workout_template'

export default class WorkoutTemplateController {
  /**
   * Get all workout templates for trainer
   * GET /trainer/workout-templates
   */
  async list({ auth, response }: HttpContext) {
    const trainer = auth.user!

    const templates = await WorkoutTemplate.query()
      .where('trainerId', trainer.id)
      .orderBy('createdAt', 'desc')

    return response.ok({
      success: true,
      data: templates.map((t) => ({
        id: t.id,
        name: t.name,
        workoutType: t.workoutType,
        exercises: t.exercises,
        description: t.description,
        isPublic: t.isPublic,
        createdAt: t.createdAt,
      })),
    })
  }

  /**
   * Create workout template
   * POST /trainer/workout-templates
   */
  async create({ auth, request, response }: HttpContext) {
    const trainer = auth.user!
    const { name, workoutType, exercises, description, isPublic } = request.only([
      'name',
      'workoutType',
      'exercises',
      'description',
      'isPublic',
    ])

    if (!name || !workoutType) {
      return response.badRequest({
        message: 'name и workoutType обязательны',
      })
    }

    const template = await WorkoutTemplate.create({
      trainerId: trainer.id,
      name,
      workoutType,
      exercises: exercises || [],
      description: description || null,
      isPublic: isPublic || false,
    })

    return response.created({
      success: true,
      data: {
        id: template.id,
        name: template.name,
        workoutType: template.workoutType,
        exercises: template.exercises,
        description: template.description,
        isPublic: template.isPublic,
      },
    })
  }

  /**
   * Update workout template
   * PUT /trainer/workout-templates/:id
   */
  async update({ auth, params, request, response }: HttpContext) {
    const trainer = auth.user!

    const template = await WorkoutTemplate.query()
      .where('id', params.id)
      .where('trainerId', trainer.id)
      .first()

    if (!template) {
      return response.notFound({ message: 'Шаблон не найден' })
    }

    const { name, workoutType, exercises, description, isPublic } = request.only([
      'name',
      'workoutType',
      'exercises',
      'description',
      'isPublic',
    ])

    if (name) template.name = name
    if (workoutType) template.workoutType = workoutType
    if (exercises) template.exercises = exercises
    if (description !== undefined) template.description = description
    if (isPublic !== undefined) template.isPublic = isPublic

    await template.save()

    return response.ok({
      success: true,
      data: {
        id: template.id,
        name: template.name,
        workoutType: template.workoutType,
        exercises: template.exercises,
        description: template.description,
        isPublic: template.isPublic,
      },
    })
  }

  /**
   * Delete workout template
   * DELETE /trainer/workout-templates/:id
   */
  async delete({ auth, params, response }: HttpContext) {
    const trainer = auth.user!

    const template = await WorkoutTemplate.query()
      .where('id', params.id)
      .where('trainerId', trainer.id)
      .first()

    if (!template) {
      return response.notFound({ message: 'Шаблон не найден' })
    }

    await template.delete()

    return response.ok({ success: true, message: 'Шаблон удален' })
  }
}
