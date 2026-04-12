import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import User from '#models/user'
import TrainerAthlete from '#models/trainer_athlete'
import TrainerGroup from '#models/trainer_group'
import ScheduledWorkout from '#models/scheduled_workout'

export default class extends BaseSeeder {
  async run() {
    // 1. Тренер
    const trainer = await User.firstOrCreate(
      { email: 'trainer@example.com' },
      { fullName: 'Алексей Тренер', password: '123456', role: 'trainer' }
    )

    // 2. Атлеты
    const userDefs = [
      {
        fullName: 'Иван Петров',
        email: 'ivan@example.com',
        password: '123456',
        role: 'athlete' as const,
      },
      {
        fullName: 'Мария Сидорова',
        email: 'maria@example.com',
        password: '123456',
        role: 'athlete' as const,
      },
      {
        fullName: 'Дмитрий Козлов',
        email: 'dmitry@example.com',
        password: '123456',
        role: 'athlete' as const,
      },
      {
        fullName: 'Анна Новикова',
        email: 'anna@example.com',
        password: '123456',
        role: 'athlete' as const,
      },
    ]

    const athletes = await Promise.all(
      userDefs.map(({ email, ...rest }) => User.firstOrCreate({ email }, rest))
    )

    const [ivan, maria, dmitry, anna] = athletes

    // 3. Связь тренер → атлеты (skip if already exists)
    for (const a of athletes) {
      await TrainerAthlete.firstOrCreate(
        { trainerId: trainer.id, athleteId: a.id },
        { status: 'active' }
      )
    }

    // 4. Группы
    const crossfit = await TrainerGroup.firstOrCreate({
      trainerId: trainer.id,
      name: 'CrossFit утро',
    })
    const power = await TrainerGroup.firstOrCreate({
      trainerId: trainer.id,
      name: 'Силовая группа',
    })

    // 5. Участники групп (sync заменяет всё)
    await crossfit.related('athletes').sync([ivan.id, maria.id, dmitry.id])
    await power.related('athletes').sync([dmitry.id, anna.id])

    // 6. Запланированные тренировки — удалить старые и создать заново
    await ScheduledWorkout.query().where('trainer_id', trainer.id).delete()

    const now = DateTime.now()

    const crossfitAssignee = { type: 'group' as const, id: crossfit.id, name: crossfit.name }
    const powerAssignee = { type: 'group' as const, id: power.id, name: power.name }
    const ivanAssignee = { type: 'athlete' as const, id: ivan.id, name: ivan.fullName! }
    const mariaAssignee = { type: 'athlete' as const, id: maria.id, name: maria.fullName! }

    await ScheduledWorkout.createMany([
      // 3 дня назад — CrossFit группа (завершена)
      {
        trainerId: trainer.id,
        scheduledDate: now.minus({ days: 3 }).set({ hour: 8, minute: 0 }),
        workoutData: {
          type: 'crossfit',
          exercises: [
            { name: 'Берпи', sets: 5, reps: 10 },
            { name: 'Трастеры', sets: 4, reps: 12, weight: 40 },
            { name: 'Подтягивания', sets: 4, reps: 8 },
          ],
          notes: 'Работаем в темпе, минимальный отдых между упражнениями',
        },
        assignedTo: [crossfitAssignee],
        status: 'completed',
      },

      // Вчера — персональная Иван
      {
        trainerId: trainer.id,
        scheduledDate: now.minus({ days: 1 }).set({ hour: 10, minute: 0 }),
        workoutData: {
          type: 'bodybuilding',
          exercises: [
            { name: 'Жим штанги лёжа', sets: 4, reps: 8, weight: 80, notes: 'Следи за лопатками' },
            { name: 'Разводка гантелей', sets: 3, reps: 12, weight: 16 },
            { name: 'Жим гантелей сидя', sets: 3, reps: 10, weight: 22 },
            { name: 'Французский жим', sets: 3, reps: 12, weight: 30 },
          ],
          notes: 'День груди и трицепса',
        },
        assignedTo: [ivanAssignee],
        status: 'completed',
      },

      // Сегодня утром — CrossFit группа
      {
        trainerId: trainer.id,
        scheduledDate: now.set({ hour: 8, minute: 0, second: 0, millisecond: 0 }),
        workoutData: {
          type: 'crossfit',
          exercises: [
            { name: 'Прыжки на ящик', sets: 5, reps: 10, notes: 'Приземление мягкое' },
            { name: 'Рывок гири', sets: 4, reps: 15, weight: 24 },
            { name: 'Отжимания', sets: 4, reps: 20 },
            { name: 'Планка', duration: 3, notes: '3 минуты без перерыва' },
          ],
          notes: 'AMRAP 20 минут',
        },
        assignedTo: [crossfitAssignee],
        status: 'scheduled',
      },

      // Сегодня вечером — Силовая группа
      {
        trainerId: trainer.id,
        scheduledDate: now.set({ hour: 19, minute: 0, second: 0, millisecond: 0 }),
        workoutData: {
          type: 'bodybuilding',
          exercises: [
            {
              name: 'Приседания со штангой',
              sets: 5,
              reps: 5,
              weight: 100,
              notes: 'Глубже параллели',
            },
            { name: 'Жим ногами', sets: 4, reps: 12, weight: 160 },
            { name: 'Выпады с гантелями', sets: 3, reps: 10, weight: 20 },
            { name: 'Икры в тренажёре', sets: 4, reps: 20, weight: 60 },
          ],
          notes: 'День ног. Контролируем технику в каждом повторе.',
        },
        assignedTo: [powerAssignee],
        status: 'scheduled',
      },

      // Завтра — Мария персональная
      {
        trainerId: trainer.id,
        scheduledDate: now.plus({ days: 1 }).set({ hour: 11, minute: 0 }),
        workoutData: {
          type: 'bodybuilding',
          exercises: [
            {
              name: 'Тяга штанги в наклоне',
              sets: 4,
              reps: 10,
              weight: 45,
              notes: 'Локти ведём назад',
            },
            { name: 'Подтягивания', sets: 4, reps: 6 },
            { name: 'Тяга гантели одной рукой', sets: 3, reps: 12, weight: 20 },
            { name: 'Гиперэкстензия', sets: 3, reps: 15 },
          ],
          notes: 'День спины',
        },
        assignedTo: [mariaAssignee],
        status: 'scheduled',
      },

      // Послезавтра — CrossFit группа
      {
        trainerId: trainer.id,
        scheduledDate: now.plus({ days: 2 }).set({ hour: 8, minute: 0 }),
        workoutData: {
          type: 'crossfit',
          exercises: [
            { name: 'Двойные прыжки на скакалке', sets: 5, reps: 50 },
            { name: 'Трастеры', sets: 5, reps: 10, weight: 42 },
            { name: 'Мышечный подъём', sets: 3, reps: 5 },
          ],
          notes: 'Подготовка к соревнованиям. Темп выше обычного.',
        },
        assignedTo: [crossfitAssignee],
        status: 'scheduled',
      },

      // Через 5 дней — обе группы
      {
        trainerId: trainer.id,
        scheduledDate: now.plus({ days: 5 }).set({ hour: 10, minute: 0 }),
        workoutData: {
          type: 'cardio',
          exercises: [
            { name: 'Бег', duration: 30, distance: 5 },
            { name: 'Велосипед', duration: 20, distance: 8 },
            { name: 'Гребля', duration: 10 },
          ],
          notes: 'Восстановительная кардио-тренировка',
        },
        assignedTo: [crossfitAssignee, powerAssignee],
        status: 'scheduled',
      },
    ])

    console.log('✅ Trainer seeder done')
    console.log(`   Тренер: trainer@example.com / 123456`)
    console.log(`   Атлеты: ivan, maria, dmitry, anna @example.com / 123456`)
    console.log(`   Группы: CrossFit утро (${crossfit.id}), Силовая группа (${power.id})`)
  }
}
