import vine from '@vinejs/vine'

export const createGroupValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(255),
  })
)

export const addAthleteByEmailValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email(),
  })
)

export const addAthleteToGroupValidator = vine.compile(
  vine.object({
    athleteId: vine.number().positive(),
  })
)
