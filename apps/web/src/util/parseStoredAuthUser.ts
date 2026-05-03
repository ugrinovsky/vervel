import type { AuthUser } from '@/contexts/auth-types';
import type { ClientPreferences } from '@/types/clientPreferences';
import { isRecord } from '@/utils/typeGuards';

function narrowClientPreferences(v: unknown): ClientPreferences | undefined {
  if (!isRecord(v)) return undefined;
  const o: ClientPreferences = {};
  if (typeof v.athleteOnboardingComplete === 'boolean') {
    o.athleteOnboardingComplete = v.athleteOnboardingComplete;
  }
  if (typeof v.trainerOnboardingComplete === 'boolean') {
    o.trainerOnboardingComplete = v.trainerOnboardingComplete;
  }
  if (v.athleteCoachIntent === 'solo' || v.athleteCoachIntent === 'with_coach') {
    o.athleteCoachIntent = v.athleteCoachIntent;
  }
  if (
    v.trainerWorkStyle === 'individual' ||
    v.trainerWorkStyle === 'groups' ||
    v.trainerWorkStyle === 'both'
  ) {
    o.trainerWorkStyle = v.trainerWorkStyle;
  }
  if (typeof v.coachTeamBannerDismissed === 'boolean') {
    o.coachTeamBannerDismissed = v.coachTeamBannerDismissed;
  }
  return Object.keys(o).length > 0 ? o : undefined;
}

/**
 * Разбор JSON из `localStorage` для `user` — без небезопасного приведения типов.
 */
export function parseStoredAuthUserJson(raw: string): AuthUser | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  if (typeof parsed.id !== 'number' || typeof parsed.email !== 'string') return null;

  const role = parsed.role;
  if (role !== null && role !== 'athlete' && role !== 'trainer' && role !== 'both') {
    return null;
  }

  const fullNameRaw = parsed.fullName;
  const fullName = typeof fullNameRaw === 'string' ? fullNameRaw : '';

  const user: AuthUser = {
    id: parsed.id,
    email: parsed.email,
    fullName,
    role,
  };

  const g = parsed.gender;
  if (g === 'male' || g === 'female' || g === null) user.gender = g;

  const photoUrl = parsed.photoUrl;
  if (typeof photoUrl === 'string' || photoUrl === null) user.photoUrl = photoUrl;

  if (typeof parsed.balance === 'number') user.balance = parsed.balance;

  const th = parsed.themeHue;
  if (typeof th === 'number' || th === null) user.themeHue = th;

  const prefs = narrowClientPreferences(parsed.clientPreferences);
  if (prefs !== undefined) user.clientPreferences = prefs;

  return user;
}
