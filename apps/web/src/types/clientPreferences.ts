/** Должен совпадать с JSON `users.client_preferences` на API. */
export type ClientPreferences = {
  athleteOnboardingComplete?: boolean;
  trainerOnboardingComplete?: boolean;
  athleteCoachIntent?: 'solo' | 'with_coach';
  trainerWorkStyle?: 'individual' | 'groups' | 'both';
  coachTeamBannerDismissed?: boolean;
};
