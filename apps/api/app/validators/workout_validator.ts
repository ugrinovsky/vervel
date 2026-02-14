import vine from '@vinejs/vine';

export const createWorkoutValidator = vine.compile(
  vine.object({
    date: vine.string().trim(),
    workoutType: vine.enum(['bodybuilding', 'crossfit', 'cardio']),
    notes: vine.string().trim().nullable().optional(),
    exercises: vine.array(
      vine.object({
        exerciseId: vine.string().trim(),
        type: vine.enum(['strength', 'cardio', 'wod']),
        sets: vine
          .array(
            vine.object({
              id: vine.string().trim(),
              reps: vine.number().min(1).max(500).optional(),
              weight: vine.number().min(0).max(1000).optional(),
              time: vine.number().min(1).max(86400).optional(),
              distance: vine.number().min(0).max(100000).optional(),
              calories: vine.number().min(0).max(10000).optional(),
              rpe: vine.number().min(1).max(10).optional(),
            })
          )
          .optional(),
        rounds: vine.number().min(1).max(100).optional(),
        duration: vine.number().min(1).max(86400).optional(),
        wodType: vine.enum(['amrap', 'emom', 'fortime', 'tabata']).optional(),
      })
    ),
  })
);

export const updateWorkoutValidator = createWorkoutValidator;
