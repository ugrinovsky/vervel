import vine from '@vinejs/vine'

export const registerValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(100),
    email: vine.string().trim().email().normalizeEmail(),
    password: vine
      .string()
      .minLength(8)
      .maxLength(100)
      .regex(/^(?=.*[a-zA-Zа-яА-Я])(?=.*\d).+$/)
      .withMessages({ regex: 'Пароль должен содержать минимум 8 символов, буквы и цифры' }),
    role: vine.enum(['athlete', 'trainer', 'both']),
    gender: vine.enum(['male', 'female']).optional(),
    refId: vine.number().positive().optional(),
  })
)
