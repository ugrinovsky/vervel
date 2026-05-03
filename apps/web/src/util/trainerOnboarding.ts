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
    title: 'Добавьте атлетов',
    desc: 'По email, QR-коду или пригласительной ссылке',
    to: '/trainer/athletes',
    label: 'Добавить',
  },
  {
    step: '2',
    title: 'Создайте шаблоны тренировок',
    desc: 'Готовые схемы — быстро назначаете, не тратите время',
    to: '/trainer/templates',
    label: 'Создать',
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
    title: 'Создайте группу',
    desc: 'Дайте название, добавьте людей — появится общий чат группы',
    to: '/trainer/groups',
    label: 'Группы',
  },
  {
    step: '2',
    title: 'Добавьте атлетов в команду',
    desc: 'По email, ссылке или QR — персональные планы и чаты',
    to: '/trainer/athletes',
    label: 'Добавить',
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
    title: 'Добавьте атлетов',
    desc: 'Персональные планы и диалоги один на один',
    to: '/trainer/athletes',
    label: 'Добавить',
  },
  {
    step: '2',
    title: 'Настройте группы',
    desc: 'Когда ведёте не только один на один, а несколько человек вместе',
    to: '/trainer/groups',
    label: 'Открыть',
  },
  {
    step: '3',
    title: 'Шаблоны и календарь',
    desc: 'Сохранённые тренировки и назначение слотов',
    to: '/trainer/templates',
    label: 'Шаблоны',
  },
];

/**
 * Пока нет атлетов — порядок шагов «С чего начать» на «Сегодня».
 * Если формат не выбран (старые аккаунты), используем сценарий «индивидуально».
 */
export function getTrainerGettingStartedSteps(
  style: TrainerWorkStyleIntent | null
): TrainerGettingStartedStep[] {
  if (style === 'groups') return GETTING_STARTED_GROUPS;
  if (style === 'both') return GETTING_STARTED_BOTH;
  return GETTING_STARTED_INDIVIDUAL;
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

export function getTrainerQuickLinks(style: TrainerWorkStyleIntent | null): TrainerQuickLink[] {
  if (style === 'individual') return [Q.athletes, Q.templates, Q.calendar, Q.groups];
  if (style === 'groups') return [Q.groups, Q.athletes, Q.calendar, Q.templates];
  /* both: первая строка — не «Атлеты», чтобы отличаться от individual */
  if (style === 'both') return [Q.templates, Q.athletes, Q.groups, Q.calendar];
  return [Q.calendar, Q.groups, Q.athletes, Q.templates];
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
      title: 'Шаблоны и календарь для персоналок',
      description: 'Один на один с атлетами: сохраняете типовую тренировку и назначаете её из календаря конкретному человеку.',
      pointsIntro:
        'В полоске меню внизу экрана есть «Шаблоны», «Календарь» и «Диалоги» — о них список ниже:',
      points: [
        '«Шаблоны» — готовый список упражнений, чтобы не набирать его каждый раз для постоянных клиентов.',
        '«Календарь» — назначаете тренировку атлету; у него она появится в расписании.',
        '«Диалоги» — только личная переписка, без группового чата.',
      ],
      footer: 'На экране «Сегодня» мы расставили быстрые переходы в порядке: атлеты → шаблоны → календарь.',
    };
  }
  if (style === 'groups') {
    return {
      title: 'Группы: шаблоны, календарь и чаты',
      description:
        'Групповые тренировки: одну программу можно сохранить и использовать снова, расписание — в календаре, обсуждение с группой и личные сообщения — в «Диалогах».',
      pointsIntro:
        'Те же три пункта в меню внизу экрана — в групповом формате они используются так:',
      points: [
        '«Шаблоны» — одна сохранённая тренировка на всю группу в приложении, без ручного копирования.',
        '«Календарь» — видно, что запланировано для группы и что назначено людям по отдельности.',
        '«Диалоги» — и общий чат группы, и личная переписка с атлетом.',
      ],
      footer:
        'На «Сегодня» первым идёт переход в «Группы», затем атлеты и календарь — как при первом входе.',
    };
  }
  if (style === 'both') {
    return {
      title: 'Один шаблон — для человека и для группы',
      description: 'Смешанный формат: персоналки и группы — одни и те же разделы помогают в обоих случаях.',
      pointsIntro:
        'Три раздела внизу экрана («Шаблоны», «Календарь», «Диалоги») для смешанного формата:',
      points: [
        '«Шаблоны» — одна заготовка и для индивидуального занятия, и для назначения группе.',
        '«Календарь» — все слоты в одном месте, чтобы не перепутать персональное и групповое.',
        '«Диалоги» — и общий чат группы, и беседа один на один.',
      ],
      footer: 'На «Сегодня» первым идёт «Шаблоны», затем атлеты и группы.',
    };
  }
  return {
    title: 'Шаблоны и календарь',
    description: 'Сохраняете черновик тренировки, назначаете время и переписываетесь с людьми из команды.',
    pointsIntro: 'В меню внизу экрана всегда можно открыть три раздела — зачем каждый:',
    points: [
      '«Шаблоны» — сохранённый список упражнений, чтобы не собирать с нуля каждый раз.',
      '«Календарь» — сюда попадают назначения; атлет увидит тренировку у себя.',
      '«Диалоги» — переписка с людьми из команды.',
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
