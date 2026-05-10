import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import TrainerLead, { type TrainerLeadCrmStatus } from '#models/trainer_lead'
import TrainerAthlete from '#models/trainer_athlete'

const LEAD_CRM_STATUSES = ['new', 'contacted', 'trial', 'converted', 'lost'] as const

function isLeadCrmStatus(value: unknown): value is TrainerLeadCrmStatus {
  return typeof value === 'string' && LEAD_CRM_STATUSES.some((s) => s === value)
}

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : null
}

function parseOptionalDateTime(value: unknown): DateTime | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  if (typeof value !== 'string') return undefined
  const dt = DateTime.fromISO(value)
  return dt.isValid ? dt : undefined
}

function serializeLead(lead: TrainerLead) {
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    source: lead.source,
    crmStatus: lead.crmStatus,
    note: lead.note,
    nextFollowUpAt: lead.nextFollowUpAt,
    convertedAthleteId: lead.convertedAthleteId,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  }
}

export default class TrainerLeadsController {
  async list({ auth, response }: HttpContext) {
    const trainer = auth.user!
    const leads = await TrainerLead.query()
      .where('trainerId', trainer.id)
      .orderByRaw('next_follow_up_at is null')
      .orderBy('nextFollowUpAt', 'asc')
      .orderBy('createdAt', 'desc')

    return response.ok({ success: true, data: leads.map(serializeLead) })
  }

  async create({ auth, request, response }: HttpContext) {
    const trainer = auth.user!
    const name = cleanString(request.input('name'), 255)
    const phone = cleanString(request.input('phone'), 64)

    if (!name || !phone) {
      return response.badRequest({ message: 'Имя и телефон обязательны' })
    }

    const crmStatusInput = request.input('crmStatus', 'new')
    if (!isLeadCrmStatus(crmStatusInput)) {
      return response.badRequest({ message: 'Некорректный CRM-статус' })
    }

    const nextFollowUpAt = parseOptionalDateTime(request.input('nextFollowUpAt'))
    if (nextFollowUpAt === undefined && request.input('nextFollowUpAt') !== undefined) {
      return response.badRequest({ message: 'Некорректная дата follow-up' })
    }

    const lead = await TrainerLead.create({
      trainerId: trainer.id,
      name,
      phone,
      email: cleanString(request.input('email'), 255),
      source: cleanString(request.input('source'), 100),
      crmStatus: crmStatusInput,
      note: cleanString(request.input('note'), 2000),
      nextFollowUpAt: nextFollowUpAt ?? null,
    })

    return response.created({ success: true, data: serializeLead(lead) })
  }

  async update({ auth, params, request, response }: HttpContext) {
    const trainer = auth.user!
    const lead = await TrainerLead.query()
      .where('id', params.id)
      .where('trainerId', trainer.id)
      .first()

    if (!lead) return response.notFound({ message: 'Лид не найден' })

    if (request.input('name') !== undefined) {
      const name = cleanString(request.input('name'), 255)
      if (!name) return response.badRequest({ message: 'Имя обязательно' })
      lead.name = name
    }

    if (request.input('phone') !== undefined) {
      const phone = cleanString(request.input('phone'), 64)
      if (!phone) return response.badRequest({ message: 'Телефон обязателен' })
      lead.phone = phone
    }

    if (request.input('crmStatus') !== undefined) {
      const crmStatus = request.input('crmStatus')
      if (!isLeadCrmStatus(crmStatus)) {
        return response.badRequest({ message: 'Некорректный CRM-статус' })
      }
      lead.crmStatus = crmStatus
    }

    if (request.input('email') !== undefined) {
      lead.email = cleanString(request.input('email'), 255)
    }
    if (request.input('source') !== undefined) {
      lead.source = cleanString(request.input('source'), 100)
    }
    if (request.input('note') !== undefined) {
      lead.note = cleanString(request.input('note'), 2000)
    }

    const nextFollowUpAtInput = request.input('nextFollowUpAt')
    if (nextFollowUpAtInput !== undefined) {
      const nextFollowUpAt = parseOptionalDateTime(nextFollowUpAtInput)
      if (nextFollowUpAt === undefined) {
        return response.badRequest({ message: 'Некорректная дата follow-up' })
      }
      lead.nextFollowUpAt = nextFollowUpAt
    }

    await lead.save()
    return response.ok({ success: true, data: serializeLead(lead) })
  }

  async convert({ auth, params, request, response }: HttpContext) {
    const trainer = auth.user!
    const athleteId = Number(request.input('athleteId'))
    if (!athleteId) return response.badRequest({ message: 'athleteId обязателен' })

    const lead = await TrainerLead.query()
      .where('id', params.id)
      .where('trainerId', trainer.id)
      .first()

    if (!lead) return response.notFound({ message: 'Лид не найден' })

    if (!(await TrainerAthlete.isActiveBinding(trainer.id, athleteId))) {
      return response.badRequest({ message: 'Атлет не привязан к вам' })
    }

    lead.convertedAthleteId = athleteId
    lead.crmStatus = 'converted'
    await lead.save()

    return response.ok({ success: true, data: serializeLead(lead) })
  }

  async delete({ auth, params, response }: HttpContext) {
    const trainer = auth.user!
    const lead = await TrainerLead.query()
      .where('id', params.id)
      .where('trainerId', trainer.id)
      .first()

    if (!lead) return response.notFound({ message: 'Лид не найден' })

    await lead.delete()
    return response.ok({ success: true, message: 'Лид удалён' })
  }
}
