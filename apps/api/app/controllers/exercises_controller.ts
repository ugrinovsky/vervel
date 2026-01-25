import { HttpContext } from '@adonisjs/core/http';
import Exercise from '#models/exercise';

export default class ExercisesController {
  public async index({}: HttpContext) {
    const exercises = await Exercise.all();
    return exercises;
  }
}
