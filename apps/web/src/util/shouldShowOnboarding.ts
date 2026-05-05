import type { ClientPreferences } from '@/types/clientPreferences';

export function shouldShowOnboarding(
  user: { role: string | null; clientPreferences?: ClientPreferences },
  activeMode: 'trainer' | 'athlete'
): boolean {
  if (!user.role) return false;
  const prefs = user.clientPreferences ?? {};
  if (user.role === 'athlete') return !prefs.athleteOnboardingComplete;
  if (user.role === 'trainer') return !prefs.trainerOnboardingComplete;
  if (user.role === 'both') {
    if (activeMode === 'trainer') return !prefs.trainerOnboardingComplete;
    return !prefs.athleteOnboardingComplete;
  }
  return false;
}
