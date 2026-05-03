import { profileApi } from '@/api/profile';
import type { AuthUser } from '@/contexts/auth-types';

const storageKey = (userId: number) => `vervel_athlete_onboarding_v1_${userId}`;

function legacyAthleteOnboardingComplete(userId: number): boolean {
  try {
    return localStorage.getItem(storageKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function isAthleteOnboardingComplete(user: AuthUser | null): boolean {
  if (!user) return false;
  const v = user.clientPreferences?.athleteOnboardingComplete;
  if (typeof v === 'boolean') return v;
  return legacyAthleteOnboardingComplete(user.id);
}

export async function markAthleteOnboardingComplete(
  user: AuthUser,
  updateUser: (u: AuthUser) => void
): Promise<void> {
  const res = await profileApi.patchClientPreferences({ athleteOnboardingComplete: true });
  updateUser({ ...user, clientPreferences: res.data.data.clientPreferences });
  try {
    localStorage.removeItem(storageKey(user.id));
  } catch {
    /* ignore */
  }
}

const coachIntentKey = (userId: number) => `vervel_athlete_coach_intent_v1_${userId}`;

function legacyCoachIntent(userId: number): 'solo' | 'with_coach' | null {
  try {
    const v = localStorage.getItem(coachIntentKey(userId));
    if (v === 'solo' || v === 'with_coach') return v;
    return null;
  } catch {
    return null;
  }
}

export async function setAthleteCoachIntent(
  user: AuthUser,
  updateUser: (u: AuthUser) => void,
  intent: 'solo' | 'with_coach'
): Promise<void> {
  const res = await profileApi.patchClientPreferences({ athleteCoachIntent: intent });
  updateUser({ ...user, clientPreferences: res.data.data.clientPreferences });
  try {
    localStorage.removeItem(coachIntentKey(user.id));
  } catch {
    /* ignore */
  }
}

export function getAthleteCoachIntent(user: AuthUser | null): 'solo' | 'with_coach' | null {
  if (!user) return null;
  const s = user.clientPreferences?.athleteCoachIntent;
  if (s === 'solo' || s === 'with_coach') return s;
  return legacyCoachIntent(user.id);
}

const coachTeamBannerDismissKey = (userId: number) =>
  `vervel_coach_team_banner_dismissed_v1_${userId}`;

function legacyBannerDismissed(userId: number): boolean {
  try {
    return localStorage.getItem(coachTeamBannerDismissKey(userId)) === '1';
  } catch {
    return false;
  }
}

export async function dismissCoachTeamBanner(
  user: AuthUser,
  updateUser: (u: AuthUser) => void
): Promise<void> {
  const res = await profileApi.patchClientPreferences({ coachTeamBannerDismissed: true });
  updateUser({ ...user, clientPreferences: res.data.data.clientPreferences });
  try {
    localStorage.removeItem(coachTeamBannerDismissKey(user.id));
  } catch {
    /* ignore */
  }
}

export function isCoachTeamBannerDismissed(user: AuthUser | null): boolean {
  if (!user) return false;
  const v = user.clientPreferences?.coachTeamBannerDismissed;
  if (typeof v === 'boolean') return v;
  return legacyBannerDismissed(user.id);
}

/**
 * Первый вход в кабинет атлета: solo / both в режиме атлета, пока не пройден мастер.
 */
export function shouldShowAthleteOnboarding(
  user: AuthUser,
  activeMode: 'trainer' | 'athlete'
): boolean {
  if (!user.role) return false;
  if (user.role === 'trainer') return false;
  if (user.role === 'both' && activeMode === 'trainer') return false;
  return !isAthleteOnboardingComplete(user);
}
