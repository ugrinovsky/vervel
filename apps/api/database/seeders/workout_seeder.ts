// database/seeders/workout_seeder.ts
import Workout from '#models/workout';
import User from '#models/user';
import { BaseSeeder } from '@adonisjs/lucid/seeders';
import { DateTime } from 'luxon';
import { randomUUID } from 'node:crypto';

export default class extends BaseSeeder {
  async run() {
    const user = await User.first();

    const exercisesData = [
      {
        name: 'Приседания со штангой',
        zones: ['legMuscles', 'glutes'],
        intensity: 0.8,
        volume: 120,
      },
      { name: 'Жим лежа', zones: ['chests', 'triceps', 'shoulders'], intensity: 0.7, volume: 90 },
      { name: 'Тяга верхнего блока', zones: ['backMuscles', 'biceps'], intensity: 0.6, volume: 80 },
      {
        name: 'Жим над головой',
        zones: ['shoulders', 'triceps', 'trapezoids'],
        intensity: 0.65,
        volume: 70,
      },
      { name: 'Подтягивания', zones: ['backMuscles', 'biceps'], intensity: 0.75, volume: 100 },
      {
        name: 'Отжимания на брусьях',
        zones: ['chests', 'triceps', 'shoulders'],
        intensity: 0.6,
        volume: 85,
      },
      {
        name: 'Становая тяга',
        zones: ['legMuscles', 'glutes', 'backMuscles', 'trapezoids'],
        intensity: 0.9,
        volume: 150,
      },
      { name: 'Сгибания ног', zones: ['legMuscles'], intensity: 0.5, volume: 60 },
      { name: 'Подъем на носки', zones: ['calfMuscles'], intensity: 0.4, volume: 50 },
      { name: 'Скручивания', zones: ['abdominalPress'], intensity: 0.3, volume: 40 },
      { name: 'Боковые скручивания', zones: ['obliquePress'], intensity: 0.3, volume: 35 },
      { name: 'Сгибания рук со штангой', zones: ['biceps'], intensity: 0.6, volume: 70 },
      { name: 'Разгибания рук на блоке', zones: ['triceps'], intensity: 0.55, volume: 65 },
      { name: 'Сгибания запястий', zones: ['forearms'], intensity: 0.4, volume: 45 },
    ];

    const wodTypes = ['amrap', 'emom', 'fortime'] as const;
    const workouts = [];
    const today = DateTime.now();

    const typePattern = [
      'bodybuilding',
      'bodybuilding',
      'crossfit',
      'bodybuilding',
      'cardio',
      'bodybuilding',
      'crossfit',
      'bodybuilding',
      'crossfit',
      'bodybuilding',
    ] as const;

    for (let i = 0; i < 60; i++) {
      const date = today.minus({ days: i });
      const workoutType = typePattern[i % typePattern.length];
      const numExercises = 3 + (i % 4);

      const selectedExercises = exercisesData.slice(
        (i * 3) % exercisesData.length,
        ((i * 3) % exercisesData.length) + numExercises
      );

      const zonesLoad: Record<string, number> = {};
      let totalIntensity = 0;
      let totalVolume = 0;

      const exercises = selectedExercises.map((exercise, exIdx) => {
        const numSets = 3 + (exIdx % 3);

        const sets = Array.from({ length: numSets }).map((_, setIdx) => {
          const reps = 8 + ((i + exIdx + setIdx) % 8);
          const weight = 20 + ((i * 7 + exIdx * 5 + setIdx * 3) % 60);

          exercise.zones.forEach((zone) => {
            if (!zonesLoad[zone]) zonesLoad[zone] = 0;
            zonesLoad[zone] += exercise.intensity * reps * (weight / 100);
          });

          if (workoutType === 'bodybuilding') {
            totalVolume += reps * weight;
          }

          return {
            id: randomUUID(),
            reps,
            weight,
          };
        });

        totalIntensity += exercise.intensity;

        return {
          exerciseId: exercise.name.toLowerCase().replace(/ /g, '_'),
          type: 'strength' as const,
          sets,
          rounds: workoutType === 'crossfit' ? 3 + (i % 3) : undefined,
          duration: workoutType === 'crossfit' ? 600 + ((i * 100) % 1200) : undefined,
          wodType: workoutType === 'crossfit' ? wodTypes[i % wodTypes.length] : undefined,
        };
      });

      const maxZoneLoad = Math.max(...Object.values(zonesLoad), 1);
      Object.keys(zonesLoad).forEach((zone) => {
        zonesLoad[zone] = zonesLoad[zone] / maxZoneLoad;
      });

      workouts.push({
        userId: user!.id,
        date,
        workoutType,
        exercises,
        zonesLoad,
        totalIntensity: totalIntensity / numExercises,
        totalVolume,
        notes: `${
          workoutType === 'crossfit'
            ? 'Кроссфит'
            : workoutType === 'cardio'
            ? 'Кардио'
            : 'Силовая'
        } тренировка ${i + 1}`,
      });
    }

    await Workout.createMany(workouts);

    console.log(`Created ${workouts.length} workouts for user ${user!.email}`);
  }
}
