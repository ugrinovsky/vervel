// database/seeders/workout_seeder.ts
import Workout from '#models/workout';
import User from '#models/user';
import { BaseSeeder } from '@adonisjs/lucid/seeders';
import { DateTime } from 'luxon';

export default class extends BaseSeeder {
  async run() {
    const user = await User.first();

    const exercisesData = [
      {
        name: 'Приседания со штангой',
        zones: ['legMuscles', 'glutes'], // quadriceps, hamstrings → legMuscles
        intensity: 0.8,
        volume: 120,
      },
      {
        name: 'Жим лежа',
        zones: ['chests', 'triceps', 'shoulders'], // pectorals → chests, deltoids → shoulders
        intensity: 0.7,
        volume: 90,
      },
      {
        name: 'Тяга верхнего блока',
        zones: ['backMuscles', 'biceps'], // latissimus, rhomboids → backMuscles
        intensity: 0.6,
        volume: 80,
      },
      {
        name: 'Жим над головой',
        zones: ['shoulders', 'triceps', 'trapezoids'], // deltoids → shoulders, trapezius → trapezoids
        intensity: 0.65,
        volume: 70,
      },
      {
        name: 'Подтягивания',
        zones: ['backMuscles', 'biceps'], // latissimus, rhomboids → backMuscles
        intensity: 0.75,
        volume: 100,
      },
      {
        name: 'Отжимания на брусьях',
        zones: ['chests', 'triceps', 'shoulders'], // pectorals → chests, deltoids → shoulders
        intensity: 0.6,
        volume: 85,
      },
      {
        name: 'Становая тяга',
        zones: ['legMuscles', 'glutes', 'backMuscles', 'trapezoids'], // hamstrings → legMuscles, latissimus → backMuscles, trapezius → trapezoids, erector_spinae → backMuscles
        intensity: 0.9,
        volume: 150,
      },
      {
        name: 'Сгибания ног',
        zones: ['legMuscles'], // hamstrings → legMuscles
        intensity: 0.5,
        volume: 60,
      },
      {
        name: 'Подъем на носки',
        zones: ['calfMuscles'], // calves → calfMuscles
        intensity: 0.4,
        volume: 50,
      },
      {
        name: 'Скручивания',
        zones: ['abdominalPress'], // abs → abdominalPress
        intensity: 0.3,
        volume: 40,
      },
      {
        name: 'Боковые скручивания',
        zones: ['obliquePress'], // косые мышцы
        intensity: 0.3,
        volume: 35,
      },
      {
        name: 'Сгибания рук со штангой',
        zones: ['biceps'],
        intensity: 0.6,
        volume: 70,
      },
      {
        name: 'Разгибания рук на блоке',
        zones: ['triceps'],
        intensity: 0.55,
        volume: 65,
      },
      {
        name: 'Сгибания запястий',
        zones: ['forearms'], // предплечья
        intensity: 0.4,
        volume: 45,
      },
    ];

    const workouts = [];
    const today = DateTime.now();

    for (let i = 0; i < 30; i++) {
      const date = today.minus({ days: i });

      if (Math.random() > 0.7) continue;

      const workoutTypes = ['crossfit', 'bodybuilding', 'mixed'] as const;
      const workoutType = workoutTypes[Math.floor(Math.random() * workoutTypes.length)];

      const numExercises = 3 + Math.floor(Math.random() * 4);
      const shuffledExercises = [...exercisesData].sort(() => 0.5 - Math.random());
      const selectedExercises = shuffledExercises.slice(0, numExercises);

      const zonesLoad: Record<string, number> = {};
      let totalIntensity = 0;
      let totalVolume = 0;

      const exercises = selectedExercises.map((exercise) => {
        const sets = 3 + Math.floor(Math.random() * 3);
        const reps = 8 + Math.floor(Math.random() * 8);
        const weight = 20 + Math.floor(Math.random() * 60);

        // Суммируем нагрузку по зонам
        exercise.zones.forEach((zone) => {
          if (!zonesLoad[zone]) zonesLoad[zone] = 0;
          zonesLoad[zone] += exercise.intensity * sets * reps * (weight / 100);
        });

        totalIntensity += exercise.intensity;
        totalVolume += sets * reps * weight;

        return {
          exerciseId: exercise.name.toLowerCase().replace(/ /g, '_'),
          sets,
          reps,
          weight,
          rounds: workoutType === 'crossfit' ? 3 + Math.floor(Math.random() * 3) : undefined,
          time: workoutType === 'crossfit' ? 600 + Math.floor(Math.random() * 1200) : undefined,
          wodType:
            workoutType === 'crossfit'
              ? ['AMRAP', 'EMOM', 'For Time'][Math.floor(Math.random() * 3)]
              : undefined,
        };
      });

      // Нормализуем нагрузки по зонам (0-1)
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
        notes: `${workoutType === 'crossfit' ? 'Кроссфит тренировка' : 'Силовая тренировка'} ${i + 1}`,
      });
    }

    await Workout.createMany(workouts);

    console.log(`Created ${workouts.length} workouts for user ${user!.email}`);
    console.log('Используемые зоны:', Array.from(new Set(exercisesData.flatMap((ex) => ex.zones))));
  }
}
