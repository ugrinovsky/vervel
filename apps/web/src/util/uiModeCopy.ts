import type { ClientPreferences } from '@/types/clientPreferences';

export type UiMode = NonNullable<ClientPreferences['uiMode']>;
export type UiModeContext = 'athlete' | 'trainer';

export const UI_MODE_ORDER: readonly UiMode[] = ['starter', 'pro', 'unleash'] as const;

export function uiModeLabel(mode: UiMode, ctx: UiModeContext): string {
  if (ctx === 'trainer') {
    switch (mode) {
      case 'starter':
        return '🌱 Минимум';
      case 'pro':
        return '⚡ Рабочий набор';
      case 'unleash':
        return '🔥 Всё включить';
    }
  }
  switch (mode) {
    case 'starter':
      return '🌱 С нуля';
    case 'pro':
      return '⚡ В деле';
    case 'unleash':
      return '🔥 Всё включить';
  }
}

/** Текст под кнопкой режима (для настроек, совпадает по смыслу с пресетами). */
export function uiModeDescription(mode: UiMode, ctx: UiModeContext): string {
  if (ctx === 'trainer') {
    switch (mode) {
      case 'starter':
        return 'Календарь, шаблоны и каталог. Серии и карта нагрузки. Без ИИ, ростера (атлеты/группы), чатов и лидерборда.';
      case 'pro':
        return 'ИИ, атлеты и группы, чаты, лидерборд, шаблоны и каталог. Без сложной аналитики (ATL/CTL, ACWR) и видеозвонков.';
      case 'unleash':
        return 'Все переключатели включены, в том числе сложная аналитика у атлета и видеозвонки.';
    }
  }
  switch (mode) {
    case 'starter':
      return 'Календарь, серии, карта нагрузки. Без ИИ, аналитики, прогрессии, команды и чатов.';
    case 'pro':
      return 'ИИ, аналитика, сила и прогрессия, команда, чаты, лидерборд. Без сложной аналитики и видеозвонков.';
    case 'unleash':
      return 'Всё включено: сложная аналитика (ATL/CTL/TSB, ACWR) и видеозвонки.';
  }
}

export function uiModeCardCopy(
  mode: UiMode,
  ctx: UiModeContext
): {
  emoji: string;
  title: string;
  subtitle: string;
  tag?: { text: string };
  unleashBadge?: { text: string };
} {
  if (ctx === 'trainer') {
    switch (mode) {
      case 'starter':
        return {
          emoji: '🌱',
          title: 'Минимум',
          subtitle:
            'Календарь и назначения без лишнего: без AI, аналитики и работы с командой на старте — меньше отвлечений, пока осваиваетесь.',
        };
      case 'pro':
        return {
          emoji: '⚡',
          title: 'Рабочий набор',
          subtitle: 'AI, аналитика, прогрессия, команда и диалоги — нормальный режим для ведения клиентов.',
          tag: { text: 'Рекомендуем' },
        };
      case 'unleash':
        return {
          emoji: '🔥',
          title: 'Всё включить',
          subtitle:
            'Периодизация, видеозвонки и остальные флаги — если уже знаете, что всем этим будете пользоваться.',
          unleashBadge: { text: 'MAX' },
        };
    }
  }

  switch (mode) {
    case 'starter':
      return {
        emoji: '🌱',
        title: 'С нуля',
        subtitle:
          'Только самое главное — дневник, календарь, нагрузка. Остальное добавишь когда понадобится.',
      };
    case 'pro':
      return {
        emoji: '⚡',
        title: 'В деле',
        subtitle: 'Аналитика, AI, прогрессия, команды и диалоги — полный функционал без перегруза.',
        tag: { text: 'Рекомендуем' },
      };
    case 'unleash':
      return {
        emoji: '🔥',
        title: 'Всё включить',
        subtitle:
          'Периодизация, видеозвонки и остальные флаги — если уже знаете, что всем этим будете пользоваться.',
        unleashBadge: { text: 'MAX' },
      };
  }
}

