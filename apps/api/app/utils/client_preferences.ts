import { isRecord } from '#utils/type_guards'
import type { JsonObject } from '#utils/type_guards'

export type ClientPreferences = {
  // ─── Onboarding completion ───────────────────────────────────────────────
  athleteOnboardingComplete?: boolean
  trainerOnboardingComplete?: boolean

  // ─── Scenario (path chosen in onboarding step 2) ─────────────────────────
  /** Unified athlete scenario — supersedes athleteCoachIntent */
  athleteScenario?: 'solo' | 'with_coach' | 'in_team'
  /** kept for backwards compat — new code reads athleteScenario instead */
  athleteCoachIntent?: 'solo' | 'with_coach'
  /** Primary fitness goal (solo athletes) */
  athletePrimaryGoal?: 'strength' | 'cardio' | 'general' | 'flexibility'
  /** Trainer work style */
  trainerWorkStyle?: 'individual' | 'groups' | 'both'

  // ─── UI ──────────────────────────────────────────────────────────────────
  coachTeamBannerDismissed?: boolean
  /** Active UI mode set during onboarding step 3 */
  uiMode?: 'starter' | 'pro' | 'unleash'

  // ─── Feature flags (source of truth — batch-set by mode or toggled manually) ──
  featAi?: boolean
  featAnalytics?: boolean
  featProgression?: boolean
  /** @deprecated предпочтительно featAdvancedAnalytics */
  featPeriodization?: boolean
  featAdvancedAnalytics?: boolean
  featTeams?: boolean
  featDialogs?: boolean
  featLeaderboard?: boolean
  featStreaks?: boolean
  featAvatar?: boolean
  featVideoCalls?: boolean
  featTrainerTemplates?: boolean
  featTrainerLibrary?: boolean
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

  // athlete scenario (new unified field)
  const scenarioValue = body.athleteScenario
  if (scenarioValue === 'solo' || scenarioValue === 'with_coach' || scenarioValue === 'in_team')
    out.athleteScenario = scenarioValue

  // legacy coach intent — still accepted for compatibility
  const aci = body.athleteCoachIntent
  if (aci === 'solo' || aci === 'with_coach') out.athleteCoachIntent = aci

  const apg = body.athletePrimaryGoal
  if (apg === 'strength' || apg === 'cardio' || apg === 'general' || apg === 'flexibility') {
    out.athletePrimaryGoal = apg
  }

  const tws = body.trainerWorkStyle
  if (tws === 'individual' || tws === 'groups' || tws === 'both') out.trainerWorkStyle = tws

  const ctd = parseBool(body.coachTeamBannerDismissed)
  if (ctd !== undefined) out.coachTeamBannerDismissed = ctd

  const uim = body.uiMode
  if (uim === 'starter' || uim === 'pro' || uim === 'unleash') out.uiMode = uim

  // feature flags
  const boolFlags = [
    'featAi',
    'featAnalytics',
    'featProgression',
    'featPeriodization',
    'featAdvancedAnalytics',
    'featTeams',
    'featDialogs',
    'featLeaderboard',
    'featStreaks',
    'featAvatar',
    'featVideoCalls',
    'featTrainerTemplates',
    'featTrainerLibrary',
  ] as const satisfies readonly (keyof ClientPreferences)[]

  for (const key of boolFlags) {
    const v = parseBool(body[key])
    if (v !== undefined) out[key] = v
  }

  return out
}

const CLIENT_PREF_KEYS = [
  'athleteOnboardingComplete',
  'trainerOnboardingComplete',
  'athleteScenario',
  'athleteCoachIntent',
  'athletePrimaryGoal',
  'trainerWorkStyle',
  'coachTeamBannerDismissed',
  'uiMode',
  'featAi',
  'featAnalytics',
  'featProgression',
  'featPeriodization',
  'featAdvancedAnalytics',
  'featTeams',
  'featDialogs',
  'featLeaderboard',
  'featStreaks',
  'featAvatar',
  'featVideoCalls',
  'featTrainerTemplates',
  'featTrainerLibrary',
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
