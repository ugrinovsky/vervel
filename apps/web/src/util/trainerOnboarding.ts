import { profileApi } from '@/api/profile';
import type { AuthUser } from '@/contexts/auth-types';

const storageKey = (userId: number) => `vervel_trainer_onboarding_v1_${userId}`;

function legacyTrainerOnboardingComplete(userId: number): boolean {
  try {
    return localStorage.getItem(storageKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function isTrainerOnboardingComplete(user: AuthUser | null): boolean {
  if (!user) return false;
  const v = user.clientPreferences?.trainerOnboardingComplete;
  if (typeof v === 'boolean') return v;
  return legacyTrainerOnboardingComplete(user.id);
}

export async function markTrainerOnboardingComplete(
  user: AuthUser,
  updateUser: (u: AuthUser) => void
): Promise<void> {
  const res = await profileApi.patchClientPreferences({ trainerOnboardingComplete: true });
  updateUser({ ...user, clientPreferences: res.data.data.clientPreferences });
  try {
    localStorage.removeItem(storageKey(user.id));
  } catch {
    /* ignore */
  }
}

const workStyleKey = (userId: number) => `vervel_trainer_work_style_v1_${userId}`;

export type TrainerWorkStyleIntent = 'individual' | 'groups' | 'both';

export async function setTrainerWorkStyleIntent(
  user: AuthUser,
  updateUser: (u: AuthUser) => void,
  style: TrainerWorkStyleIntent
): Promise<void> {
  const res = await profileApi.patchClientPreferences({ trainerWorkStyle: style });
  updateUser({ ...user, clientPreferences: res.data.data.clientPreferences });
  try {
    localStorage.removeItem(workStyleKey(user.id));
  } catch {
    /* ignore */
  }
}

export function getTrainerWorkStyleIntent(user: AuthUser | null): TrainerWorkStyleIntent | null {
  if (!user) return null;
  const s = user.clientPreferences?.trainerWorkStyle;
  if (s === 'individual' || s === 'groups' || s === 'both') return s;
  try {
    const v = localStorage.getItem(workStyleKey(user.id));
    if (v === 'individual' || v === 'groups' || v === 'both') return v;
    return null;
  } catch {
    return null;
  }
}

/** Подсказка на дашборде «Сегодня» — под выбранный в онбординге формат работы */
export function getTrainerTodayDashboardHint(style: TrainerWorkStyleIntent): string {
  switch (style) {
    case 'individual':
      return 'Персоналки в приоритете: порядок быстрых ссылок начинается с Атлетов.';
    case 'groups':
      return 'Группы в приоритете: первая быстрая ссылка — Группы.';
    case 'both':
      return 'Смешанный формат: первая быстрая ссылка — Шаблоны (общая база для персоналок и групп).';
  }
}

export type TrainerGettingStartedStep = {
  step: string;
  title: string;
  desc: string;
  to: string;
  label: string;
};

const GETTING_STARTED_INDIVIDUAL: TrainerGettingStartedStep[] = [
  {
    step: '1',
    title: 'Запишите первого клиента в CRM',
    desc: 'Фиксируйте заявки сразу — имя, телефон, статус, дата напоминания',
    to: '/trainer/crm',
    label: 'Открыть CRM',
  },
  {
    step: '2',
    title: 'Добавьте атлетов',
    desc: 'По email, QR-коду или пригласительной ссылке',
    to: '/trainer/athletes',
    label: 'Добавить',
  },
  {
    step: '3',
    title: 'Запланируйте занятия',
    desc: 'Назначьте тренировки в календаре — атлеты увидят их у себя',
    to: '/trainer/calendar',
    label: 'Открыть',
  },
];

const GETTING_STARTED_GROUPS: TrainerGettingStartedStep[] = [
  {
    step: '1',
    title: 'Запишите первого клиента в CRM',
    desc: 'Не теряйте заявки — фиксируйте всех, кто интересовался, до того как станут атлетами',
    to: '/trainer/crm',
    label: 'Открыть CRM',
  },
  {
    step: '2',
    title: 'Создайте группу',
    desc: 'Дайте название, добавьте людей — появится общий чат группы',
    to: '/trainer/groups',
    label: 'Группы',
  },
  {
    step: '3',
    title: 'Запланируйте слоты',
    desc: 'Календарь — для групповых и персональных тренировок',
    to: '/trainer/calendar',
    label: 'Открыть',
  },
];

const GETTING_STARTED_BOTH: TrainerGettingStartedStep[] = [
  {
    step: '1',
    title: 'Запишите первого клиента в CRM',
    desc: 'Лиды, статусы атлетов и аналитика в одном месте',
    to: '/trainer/crm',
    label: 'Открыть CRM',
  },
  {
    step: '2',
    title: 'Добавьте атлетов',
    desc: 'Персональные планы и диалоги один на один',
    to: '/trainer/athletes',
    label: 'Добавить',
  },
  {
    step: '3',
    title: 'Настройте группы и календарь',
    desc: 'Когда ведёте не только один на один, а несколько человек вместе',
    to: '/trainer/groups',
    label: 'Открыть',
  },
];

/**
 * Пока нет атлетов — порядок шагов «С чего начать» на «Сегодня».
 * Если формат не выбран (старые аккаунты), используем сценарий «индивидуально».
 */
export type TrainerGettingStartedOptions = {
  /** Если false — убираем шаги со ссылкой на шаблоны (как в настройках тренера). */
  templates?: boolean;
  /** Если false — убираем шаги про команду / атлетов / группы (согласовано с календарём без назначений). */
  teams?: boolean;
};

const ROSTER_PATHS = ['/trainer/athletes', '/trainer/groups', '/trainer/team'] as const;

function isRosterPath(path: string): boolean {
  return ROSTER_PATHS.some((p) => p === path);
}

export function getTrainerGettingStartedSteps(
  style: TrainerWorkStyleIntent | null,
  options?: TrainerGettingStartedOptions
): TrainerGettingStartedStep[] {
  let steps: TrainerGettingStartedStep[];
  if (style === 'groups') steps = [...GETTING_STARTED_GROUPS];
  else if (style === 'both') steps = [...GETTING_STARTED_BOTH];
  else steps = [...GETTING_STARTED_INDIVIDUAL];

  const showTemplates = options?.templates !== false;
  const showTeams = options?.teams !== false;

  if (!showTemplates) {
    const hadTemplates = steps.some((s) => s.to === '/trainer/templates');
    steps = steps.filter((s) => s.to !== '/trainer/templates');
    if (hadTemplates && style === 'both' && !steps.some((s) => s.to === '/trainer/calendar')) {
      steps.push({
        step: '0',
        title: 'Запланируйте в календаре',
        desc: 'Назначьте тренировки и слоты — атлеты увидят у себя',
        to: '/trainer/calendar',
        label: 'Открыть',
      });
    }
  }

  if (!showTeams) {
    steps = steps.filter((s) => !isRosterPath(s.to));
    if (!steps.some((s) => s.to === '/trainer/calendar')) {
      steps.push({
        step: '0',
        title: 'Календарь',
        desc: 'Планирование без ростера в приложении. Включите «Атлеты и группы» в настройках, чтобы назначать тренировки из списка клиентов.',
        to: '/trainer/calendar',
        label: 'Открыть',
      });
    }
  }

  return steps.map((s, i) => ({ ...s, step: String(i + 1) }));
}

/** Быстрые ссылки на «Сегодня» — порядок зависит от формата работы из онбординга */
export type TrainerQuickLink = {
  emoji: string;
  bg: string;
  label: string;
  sub: string;
  to: string;
};

const Q = {
  calendar: {
    emoji: '📅',
    bg: 'bg-emerald-500/20',
    label: 'Календарь',
    sub: 'Назначить тренировки',
    to: '/trainer/calendar',
  },
  groups: {
    emoji: '👥',
    bg: 'bg-blue-500/20',
    label: 'Группы',
    sub: 'Управление группами',
    to: '/trainer/groups',
  },
  athletes: {
    emoji: '🏃',
    bg: 'bg-violet-500/20',
    label: 'Атлеты',
    sub: 'Управление атлетами',
    to: '/trainer/athletes',
  },
  templates: {
    emoji: '📋',
    bg: 'bg-amber-500/20',
    label: 'Шаблоны',
    sub: 'Готовые тренировки',
    to: '/trainer/templates',
  },
} satisfies Record<string, TrainerQuickLink>;

export function getTrainerQuickLinks(
  style: TrainerWorkStyleIntent | null,
  visibility?: { templates?: boolean; teams?: boolean }
): TrainerQuickLink[] {
  const showTemplates = visibility?.templates !== false;
  const showTeams = visibility?.teams !== false;
  const filter = (arr: TrainerQuickLink[]) =>
    arr.filter((l) => {
      if (l.to === '/trainer/templates' && !showTemplates) return false;
      if ((l.to === '/trainer/athletes' || l.to === '/trainer/groups') && !showTeams) return false;
      return true;
    });

  if (style === 'individual') return filter([Q.athletes, Q.templates, Q.calendar, Q.groups]);
  if (style === 'groups') return filter([Q.groups, Q.athletes, Q.calendar, Q.templates]);
  /* both: первая строка — не «Атлеты», чтобы отличаться от individual */
  if (style === 'both') return filter([Q.templates, Q.athletes, Q.groups, Q.calendar]);
  return filter([Q.calendar, Q.groups, Q.athletes, Q.templates]);
}

/** Шаг онбординга «Атлеты» — заголовок и тексты зависят от формата на шаге 1 */
export type TrainerOnboardingAthletesStepCopy = {
  icon: string;
  title: string;
  description: string;
  cardLead: string;
  cardHowTitle: string;
};

export function getTrainerOnboardingAthletesStep(
  style: TrainerWorkStyleIntent | null
): TrainerOnboardingAthletesStepCopy {
  if (style === 'individual') {
    return {
      icon: '👤',
      title: 'Атлеты — база персоналки',
      description:
        'Вы указали индивидуальный формат: у каждого атлета — свои чаты и персональные назначения. Без людей в списке это не заведётся.',
      cardLead:
        'Добавьте атлетов в первую очередь — потом шаблоны и календарь будут работать на конкретных людей.',
      cardHowTitle: 'Как добавить атлета',
    };
  }
  if (style === 'groups') {
    return {
      icon: '👥',
      title: 'Атлеты для групп и слотов',
      description:
        'Упор на группы: сами группы и общие чаты настраиваются в другом месте, но в команде всё равно нужны атлеты — иначе некому назначать и не с кем вести личные диалоги.',
      cardLead:
        'Сначала соберите состав в команде; параллельно или следом создадите группы в разделе «Команда».',
      cardHowTitle: 'Как добавить атлета в команду',
    };
  }
  if (style === 'both') {
    return {
      icon: '🔀',
      title: 'Команда: персоналки и группы',
      description:
        'Смешанный формат: и один на один, и совместные занятия. Список атлетов — общий фундамент: от него зависят чаты и любые назначения.',
      cardLead:
        'Начните с актуального состава; дальше в мастере — шаблоны и календарь под оба сценария.',
      cardHowTitle: 'Как добавить атлета',
    };
  }
  return {
    icon: '👥',
    title: 'Атлеты в команде',
    description:
      'Без атлетов в списке не заработают чаты с ними и назначения в календаре — добавьте людей в первую очередь.',
    cardLead: 'Раздел «Команда» — список атлетов и приглашения.',
    cardHowTitle: 'Как добавить атлета',
  };
}

/** Шаг «Шаблоны и календарь» — разный акцент по формату */
export type TrainerOnboardingWorkflowStepCopy = {
  title: string;
  description: string;
  /** Одно предложение перед нумерованным списком: где искать разделы */
  pointsIntro: string;
  points: [string, string, string];
  footer: string;
};

export function getTrainerOnboardingWorkflowStep(
  style: TrainerWorkStyleIntent | null
): TrainerOnboardingWorkflowStepCopy {
  if (style === 'individual') {
    return {
      title: 'Инструменты кабинета тренера',
      description:
        'Один на один с атлетами: сохраняете типовую тренировку, назначаете из календаря, ведёте клиентскую базу.',
      pointsIntro: 'В меню внизу четыре раздела — о каждом коротко:',
      points: [
        '«CRM» — заявки и статусы действующих атлетов.',
        '«Шаблоны» — готовый список упражнений, чтобы не набирать заново для постоянных клиентов.',
        '«Календарь» — назначаете тренировку атлету; у него она появится в расписании.',
      ],
      footer: 'Начните с CRM: запишите первую заявку — и двигайтесь к шаблонам и календарю.',
    };
  }
  if (style === 'groups') {
    return {
      title: 'Группы, CRM и инструменты',
      description:
        'Групповые тренировки плюс клиентский пайплайн: CRM поможет не терять потенциальных участников групп.',
      pointsIntro: 'Разделы меню внизу экрана — в групповом формате:',
      points: [
        '«CRM» — заявки и статусы клиентов; удобно отслеживать, кто готов вступить в группу.',
        '«Шаблоны» — одна сохранённая тренировка на всю группу, без ручного копирования.',
        '«Календарь» — видно, что запланировано для группы и для каждого отдельно.',
      ],
      footer: 'На «Сегодня» первым идёт «Группы», затем CRM, атлеты и календарь.',
    };
  }
  if (style === 'both') {
    return {
      title: 'CRM, шаблоны и календарь',
      description:
        'Смешанный формат: персоналки и группы — CRM держит всю клиентскую базу в одном месте.',
      pointsIntro: 'Четыре раздела внизу экрана для смешанного формата:',
      points: [
        '«CRM» — воронка заявок и статусы атлетов: кто активен, кто на паузе, кто уходит.',
        '«Шаблоны» — одна заготовка и для персоналки, и для назначения группе.',
        '«Календарь» — все слоты в одном месте, чтобы не перепутать персональное и групповое.',
      ],
      footer: 'На «Сегодня» первым идёт «Шаблоны», рядом CRM и атлеты.',
    };
  }
  return {
    title: 'CRM, шаблоны и календарь',
    description:
      'Ведёте клиентскую базу в CRM, сохраняете шаблоны тренировок и назначаете время в календаре.',
    pointsIntro: 'В меню внизу всегда доступны основные разделы:',
    points: [
      '«CRM» — заявки и статусы клиентов, аналитика базы.',
      '«Шаблоны» — сохранённый список упражнений, чтобы не собирать с нуля каждый раз.',
      '«Календарь» — сюда попадают назначения; атлет увидит тренировку у себя.',
    ],
    footer: 'После мастера откройте «Сегодня» — там подсказки, пока в команде мало людей.',
  };
}

/**
 * Кабинет тренера (роль trainer или both в режиме trainer), пока не завершён мастер.
 */
export function shouldShowTrainerOnboarding(
  user: AuthUser,
  activeMode: 'trainer' | 'athlete'
): boolean {
  if (!user.role) return false;
  const inTrainerCabinet =
    user.role === 'trainer' || (user.role === 'both' && activeMode === 'trainer');
  if (!inTrainerCabinet) return false;
  return !isTrainerOnboardingComplete(user);
}
