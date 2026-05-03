import type { ReactNode } from 'react';

export const PWA_STEPS: Record<'ios' | 'android' | 'desktop', { hint: string; steps: ReactNode[] }> = {
  ios: {
    hint: 'На iPhone уведомления работают только когда приложение добавлено на главный экран.',
    steps: [
      <>Нажмите <span className="text-white">Поделиться</span> внизу Safari</>,
      <>Выберите <span className="text-white">«На экран «Домой»»</span></>,
      <>Откройте приложение с главного экрана</>,
      <>Включите уведомления в настройках профиля</>,
    ],
  },
  android: {
    hint: 'Установите приложение для получения уведомлений.',
    steps: [
      <>Нажмите <span className="text-white">⋮</span> в правом верхнем углу Chrome</>,
      <>Выберите <span className="text-white">«Добавить на главный экран»</span></>,
      <>Откройте приложение с главного экрана</>,
      <>Включите уведомления в настройках профиля</>,
    ],
  },
  desktop: {
    hint: 'Установите приложение для получения уведомлений.',
    steps: [
      <>Нажмите значок <span className="text-white">установки</span> в адресной строке браузера</>,
      <>Или откройте меню браузера → <span className="text-white">«Установить приложение»</span></>,
      <>Откройте установленное приложение</>,
      <>Включите уведомления в настройках профиля</>,
    ],
  },
};

export function detectPwaPlatform(): 'ios' | 'android' | 'desktop' {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

/** Тот же критерий, что «не desktop» в detectPwaPlatform — без дублирования regex по файлам */
export function isMobileBrowser(): boolean {
  return detectPwaPlatform() !== 'desktop';
}

export function isPwaStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Reflect.get(navigator, 'standalone') === true)
  );
}
