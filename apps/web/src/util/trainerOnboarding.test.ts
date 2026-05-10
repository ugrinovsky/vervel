import { describe, it, expect } from 'vitest';
import {
  getTrainerGettingStartedSteps,
  getTrainerOnboardingWorkflowStep,
  getTrainerQuickLinks,
  getTrainerTodayDashboardHint,
  shouldShowTrainerOnboarding,
  isTrainerOnboardingComplete,
} from './trainerOnboarding';
import type { AuthUser } from '@/contexts/auth-types';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 1,
    name: 'Test',
    email: 'test@example.com',
    role: 'trainer',
    clientPreferences: { trainerOnboardingComplete: true },
    ...overrides,
  } as AuthUser;
}

// ─── isTrainerOnboardingComplete ─────────────────────────────────────────────

describe('isTrainerOnboardingComplete', () => {
  it('false для null', () => {
    expect(isTrainerOnboardingComplete(null)).toBe(false);
  });

  it('true если clientPreferences.trainerOnboardingComplete = true', () => {
    expect(
      isTrainerOnboardingComplete(makeUser({ clientPreferences: { trainerOnboardingComplete: true } }))
    ).toBe(true);
  });

  it('false если clientPreferences.trainerOnboardingComplete = false', () => {
    expect(
      isTrainerOnboardingComplete(makeUser({ clientPreferences: { trainerOnboardingComplete: false } }))
    ).toBe(false);
  });
});

// ─── shouldShowTrainerOnboarding ─────────────────────────────────────────────

describe('shouldShowTrainerOnboarding', () => {
  it('показывает онбординг для тренера без завершения', () => {
    const user = makeUser({ role: 'trainer', clientPreferences: { trainerOnboardingComplete: false } });
    expect(shouldShowTrainerOnboarding(user, 'trainer')).toBe(true);
  });

  it('не показывает если онбординг завершён', () => {
    const user = makeUser({ role: 'trainer', clientPreferences: { trainerOnboardingComplete: true } });
    expect(shouldShowTrainerOnboarding(user, 'trainer')).toBe(false);
  });

  it('не показывает для режима athlete при role=both', () => {
    const user = makeUser({ role: 'both', clientPreferences: { trainerOnboardingComplete: false } });
    expect(shouldShowTrainerOnboarding(user, 'athlete')).toBe(false);
  });

  it('показывает для режима trainer при role=both', () => {
    const user = makeUser({ role: 'both', clientPreferences: { trainerOnboardingComplete: false } });
    expect(shouldShowTrainerOnboarding(user, 'trainer')).toBe(true);
  });

  it('не показывает для role=athlete', () => {
    const user = makeUser({ role: 'athlete', clientPreferences: { trainerOnboardingComplete: false } });
    expect(shouldShowTrainerOnboarding(user, 'athlete')).toBe(false);
  });
});

// ─── getTrainerGettingStartedSteps ───────────────────────────────────────────

describe('getTrainerGettingStartedSteps', () => {
  it('первый шаг всегда CRM для individual', () => {
    const steps = getTrainerGettingStartedSteps('individual');
    expect(steps[0].to).toBe('/trainer/crm');
    expect(steps[0].step).toBe('1');
  });

  it('первый шаг всегда CRM для groups', () => {
    const steps = getTrainerGettingStartedSteps('groups');
    expect(steps[0].to).toBe('/trainer/crm');
  });

  it('первый шаг всегда CRM для both', () => {
    const steps = getTrainerGettingStartedSteps('both');
    expect(steps[0].to).toBe('/trainer/crm');
  });

  it('первый шаг CRM для null (fallback individual)', () => {
    const steps = getTrainerGettingStartedSteps(null);
    expect(steps[0].to).toBe('/trainer/crm');
  });

  it('шаги нумеруются последовательно начиная с 1', () => {
    const steps = getTrainerGettingStartedSteps('individual');
    steps.forEach((s, i) => {
      expect(s.step).toBe(String(i + 1));
    });
  });

  it('при teams=false убирает шаги с атлетами/группами', () => {
    const steps = getTrainerGettingStartedSteps('individual', { teams: false });
    const paths = steps.map((s) => s.to);
    expect(paths).not.toContain('/trainer/athletes');
    expect(paths).not.toContain('/trainer/groups');
    expect(paths).not.toContain('/trainer/team');
  });

  it('при teams=false добавляет шаг с календарём если его не было', () => {
    const steps = getTrainerGettingStartedSteps('individual', { teams: false });
    const paths = steps.map((s) => s.to);
    expect(paths).toContain('/trainer/calendar');
  });

  it('CRM остаётся при teams=false', () => {
    const steps = getTrainerGettingStartedSteps('individual', { teams: false });
    expect(steps[0].to).toBe('/trainer/crm');
  });
});

// ─── getTrainerOnboardingWorkflowStep ────────────────────────────────────────

describe('getTrainerOnboardingWorkflowStep', () => {
  const styles = ['individual', 'groups', 'both', null] as const;

  styles.forEach((style) => {
    it(`упоминает CRM в точках для стиля «${style ?? 'null'}»`, () => {
      const step = getTrainerOnboardingWorkflowStep(style);
      const crmMentioned = step.points.some((p) => p.toLowerCase().includes('crm'));
      expect(crmMentioned).toBe(true);
    });
  });

  it('individual — первая точка упоминает заявки или статусы', () => {
    const step = getTrainerOnboardingWorkflowStep('individual');
    const text = step.points[0].toLowerCase();
    expect(text.includes('заявк') || text.includes('статус') || text.includes('crm')).toBe(true);
  });

  it('groups — первая точка упоминает заявки или статусы', () => {
    const step = getTrainerOnboardingWorkflowStep('groups');
    const text = step.points[0].toLowerCase();
    expect(text.includes('заявк') || text.includes('статус') || text.includes('crm')).toBe(true);
  });

  it('both — первая точка упоминает воронку или базу', () => {
    const step = getTrainerOnboardingWorkflowStep('both');
    const text = step.points[0].toLowerCase();
    expect(text.includes('воронк') || text.includes('баз') || text.includes('атлет')).toBe(true);
  });
});

// ─── getTrainerQuickLinks ─────────────────────────────────────────────────────

describe('getTrainerQuickLinks', () => {
  it('individual — атлеты первые', () => {
    const links = getTrainerQuickLinks('individual');
    expect(links[0].to).toBe('/trainer/athletes');
  });

  it('groups — группы первые', () => {
    const links = getTrainerQuickLinks('groups');
    expect(links[0].to).toBe('/trainer/groups');
  });

  it('both — шаблоны первые', () => {
    const links = getTrainerQuickLinks('both');
    expect(links[0].to).toBe('/trainer/templates');
  });

  it('teams=false убирает атлетов и группы', () => {
    const links = getTrainerQuickLinks('individual', { teams: false });
    const paths = links.map((l) => l.to);
    expect(paths).not.toContain('/trainer/athletes');
    expect(paths).not.toContain('/trainer/groups');
  });

  it('templates=false убирает шаблоны', () => {
    const links = getTrainerQuickLinks('both', { templates: false });
    expect(links.map((l) => l.to)).not.toContain('/trainer/templates');
  });

  it('null — возвращает непустой список', () => {
    expect(getTrainerQuickLinks(null).length).toBeGreaterThan(0);
  });
});

// ─── getTrainerTodayDashboardHint ─────────────────────────────────────────────

describe('getTrainerTodayDashboardHint', () => {
  it('individual — упоминает «Атлетов»', () => {
    expect(getTrainerTodayDashboardHint('individual')).toContain('Атлетов');
  });

  it('groups — упоминает «Группы»', () => {
    expect(getTrainerTodayDashboardHint('groups')).toContain('Группы');
  });

  it('both — упоминает «Шаблоны»', () => {
    expect(getTrainerTodayDashboardHint('both')).toContain('Шаблоны');
  });
});
