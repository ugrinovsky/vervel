import { BaseSeeder } from '@adonisjs/lucid/seeders';
import Exercise from '#models/exercise';

export default class ExerciseSeeder extends BaseSeeder {
  public async run() {
    await Exercise.updateOrCreateMany('id', [
      {
        id: 'bench_press',
        title: 'Жим лежа',
        keywords: ['жим', 'bench'],
        zones: ['chests', 'triceps', 'shoulders'],
        intensity: 0.7,
      },
      {
        id: 'squat',
        title: 'Присед',
        keywords: ['присед'],
        zones: ['legs', 'glutes', 'core'],
        intensity: 0.8,
      },
      {
        id: 'burpee',
        title: 'Берпи',
        keywords: ['берпи'],
        zones: ['legs', 'core', 'shoulders'],
        intensity: 0.9,
      },
    ]);
  }
}
