import { isRecord } from '#utils/type_guards'
import type { JsonObject } from '#utils/type_guards'

export type ClientPreferences = {
  athleteOnboardingComplete?: boolean
  trainerOnboardingComplete?: boolean
  athleteCoachIntent?: 'solo' | 'with_coach'
  trainerWorkStyle?: 'individual' | 'groups' | 'both'
  coachTeamBannerDismissed?: boolean
}

function parseBool(v: unknown): boolean | undefined {
  if (v === true || v === false) return v
  return undefined
}

/** Принимает только известные ключи и допустимые значения (частичное обновление JSON). */
export function patchClientPreferencesFromBody(body: unknown): Partial<ClientPreferences> {
  if (!isRecord(body)) return {}
  const out: Partial<ClientPreferences> = {}

  const aoc = parseBool(body.athleteOnboardingComplete)
  if (aoc !== undefined) out.athleteOnboardingComplete = aoc

  const toc = parseBool(body.trainerOnboardingComplete)
  if (toc !== undefined) out.trainerOnboardingComplete = toc

  const aci = body.athleteCoachIntent
  if (aci === 'solo' || aci === 'with_coach') out.athleteCoachIntent = aci

  const tws = body.trainerWorkStyle
  if (tws === 'individual' || tws === 'groups' || tws === 'both') out.trainerWorkStyle = tws

  const ctd = parseBool(body.coachTeamBannerDismissed)
  if (ctd !== undefined) out.coachTeamBannerDismissed = ctd

  return out
}

const CLIENT_PREF_KEYS = [
  'athleteOnboardingComplete',
  'trainerOnboardingComplete',
  'athleteCoachIntent',
  'trainerWorkStyle',
  'coachTeamBannerDismissed',
] as const satisfies readonly (keyof ClientPreferences)[]

function mergeDefinedField<K extends keyof ClientPreferences>(
  base: ClientPreferences,
  patch: Partial<ClientPreferences>,
  key: K
): void {
  const v = patch[key]
  if (v !== undefined) base[key] = v
}

export function mergeClientPreferences(
  existing: ClientPreferences | JsonObject | null | undefined,
  patch: Partial<ClientPreferences>
): ClientPreferences {
  const base: ClientPreferences = { ...(existing ?? {}) }
  for (const k of CLIENT_PREF_KEYS) {
    mergeDefinedField(base, patch, k)
  }
  return base
}
