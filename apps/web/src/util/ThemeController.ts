/**
 * ThemeController — single source of truth for theme management.
 *
 * Rules:
 *  - Only this module reads/writes themeHue / themeSpecial in localStorage.
 *  - Only this module applies CSS variables and meta[theme-color].
 *  - External code calls ThemeController methods only.
 *
 * Two independent dimensions:
 *  1. Special theme: 'dark' | 'light' | null (null = use hue-based)
 *  2. Hue: number (accent color, used when specialTheme is null)
 */
import { profileApi } from '@/api/profile';

export const DEFAULT_HUE = 175;
export type SpecialTheme = 'dark' | 'light';

export const THEME_PRESETS = [
  { label: 'Зелёный', hue: 140 },
  { label: 'Мятный', hue: 163 },
  { label: 'Бирюзовый', hue: 175 },
  { label: 'Лазурный', hue: 195 },
  { label: 'Синий', hue: 218 },
  { label: 'Индиго', hue: 248 },
  { label: 'Фиолетовый', hue: 270 },
  { label: 'Сиреневый', hue: 285 },
  { label: 'Розовый', hue: 318 },
  { label: 'Малиновый', hue: 345 },
  { label: 'Коралловый', hue: 8 },
  { label: 'Янтарный', hue: 38 },
];

/* ------------------------------------------------------------------ */
/* Internal helpers                                                     */
/* ------------------------------------------------------------------ */

function hslToRgb(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  const r = Math.round(f(0) * 255);
  const g = Math.round(f(8) * 255);
  const b = Math.round(f(4) * 255);
  return `${r} ${g} ${b}`;
}

const TAILWIND_FAMILIES = ['emerald', 'teal', 'green', 'amber', 'orange'];

const ACCENT_SHADES: Record<string, [number, number]> = {
  '100': [65, 92], '200': [70, 82], '300': [68, 72], '400': [68, 55],
  '500': [78, 40], '600': [82, 31], '700': [84, 23], '800': [80, 17], '900': [75, 13],
};

const DARK_ACCENT_HUE = 172;
const LIGHT_ACCENT_HUE = 215;

const SPECIAL_THEME_PROPS = [
  '--color_bg_card', '--color_bg_card_hover', '--color_bg_input',
  '--color_border', '--color_border_light',
  '--color_text_primary', '--color_text_secondary', '--color_text_muted',
] as const;

function applyAccentTailwindColors(root: HTMLElement, accentHue: number, lightnessBoost = 0, satMult = 1) {
  for (const [shade, [sat, light]] of Object.entries(ACCENT_SHADES)) {
    const rgb = `rgb(${hslToRgb(accentHue, sat * satMult, Math.min(light + lightnessBoost, 94))})`;
    for (const family of TAILWIND_FAMILIES) {
      root.style.setProperty(`--color-${family}-${shade}`, rgb);
    }
  }
}

function applyHueTheme(root: HTMLElement, hue: number) {
  root.removeAttribute('data-theme');
  for (const prop of SPECIAL_THEME_PROPS) root.style.removeProperty(prop);

  const hLight = ((hue - 8) + 360) % 360;
  const hDark = (hue + 26) % 360;
  const primary = hslToRgb(hue, 74, 21);
  const primaryDark = hslToRgb(hDark, 67, 17);

  const hN = ((hLight % 360) + 360) % 360;
  const lightL =
    hN >= 30 && hN <= 100 ? 38
    : hN >= 100 && hN <= 170 ? 38
    : hN >= 200 && hN <= 290 ? 50
    : 44;
  const primaryLight = hslToRgb(hLight, 75, lightL);

  const iconL =
    hN >= 30 && hN <= 100 ? 58
    : hN >= 100 && hN <= 170 ? 60
    : hN >= 200 && hN <= 290 ? 70
    : 63;
  const primaryIcon = hslToRgb(hLight, 72, iconL);

  root.style.setProperty('--color_primary', `rgb(${primary})`);
  root.style.setProperty('--color_primary_dark', `rgb(${primaryDark})`);
  root.style.setProperty('--color_primary_light', `rgb(${primaryLight})`);
  root.style.setProperty('--color_primary_icon', `rgb(${primaryIcon})`);
  root.style.setProperty('--color_primary_ch', primary);
  root.style.setProperty('--color_primary_dark_ch', primaryDark);
  root.style.setProperty('--color_primary_light_ch', primaryLight);
  root.style.setProperty('--color_bg_screen', `radial-gradient(circle at 50% 52.5%, rgb(${primary}) 0%, rgb(${primaryDark}) 90%)`);

  const shades: Record<string, [number, number]> = {
    '100': [65, 92], '200': [70, 82], '300': [68, 72], '400': [68, 55],
    '500': [78, 40], '600': [82, 31], '700': [84, 23], '800': [80, 17], '900': [75, 13],
  };
  for (const [shade, [sat, light]] of Object.entries(shades)) {
    const rgb = `rgb(${hslToRgb(hLight, sat, light)})`;
    for (const family of TAILWIND_FAMILIES) {
      root.style.setProperty(`--color-${family}-${shade}`, rgb);
    }
  }

  const [r, g, b] = primaryDark.split(' ').map(Number);
  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', hex);

  root.style.setProperty('--safe_area_bg', `rgb(${primaryDark})`);
}

function applySpecialTheme(root: HTMLElement, type: SpecialTheme) {
  if (type === 'light') {
    applyAccentTailwindColors(root, LIGHT_ACCENT_HUE, 12, 0.6);
    root.setAttribute('data-theme', 'light');
    root.style.setProperty('--color_primary', 'rgb(246, 246, 246)');
    root.style.setProperty('--color_primary_dark', 'rgb(236, 236, 236)');
    root.style.setProperty('--color_primary_light', 'rgb(75, 120, 175)');
    root.style.setProperty('--color_primary_icon', 'rgb(58, 100, 155)');
    root.style.setProperty('--color_primary_ch', '246 246 246');
    root.style.setProperty('--color_primary_dark_ch', '236 236 236');
    root.style.setProperty('--color_primary_light_ch', '75 120 175');
    root.style.setProperty('--color_bg_screen', 'rgb(244, 243, 241)');
    root.style.setProperty('--color_bg_card', 'rgb(255, 255, 255)');
    root.style.setProperty('--color_bg_card_hover', 'rgb(248, 248, 248)');
    root.style.setProperty('--color_bg_input', 'rgb(255, 255, 255)');
    root.style.setProperty('--color_border', 'rgba(0, 0, 0, 0.1)');
    root.style.setProperty('--color_border_light', 'rgba(0, 0, 0, 0.07)');
    root.style.setProperty('--color_text_primary', 'rgba(0, 0, 0, 0.88)');
    root.style.setProperty('--color_text_secondary', 'rgba(0, 0, 0, 0.72)');
    root.style.setProperty('--color_text_muted', 'rgba(0, 0, 0, 0.48)');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f4f3f1');
    root.style.setProperty('--safe_area_bg', 'rgb(244, 243, 241)');
  } else {
    applyAccentTailwindColors(root, DARK_ACCENT_HUE, 0, 1);
    root.removeAttribute('data-theme');
    root.style.setProperty('--color_primary', 'rgb(22, 22, 28)');
    root.style.setProperty('--color_primary_dark', 'rgb(12, 12, 16)');
    root.style.setProperty('--color_primary_light', 'rgb(42, 168, 152)');
    root.style.setProperty('--color_primary_icon', 'rgb(72, 198, 182)');
    root.style.setProperty('--color_primary_ch', '22 22 28');
    root.style.setProperty('--color_primary_dark_ch', '12 12 16');
    root.style.setProperty('--color_primary_light_ch', '42 168 152');
    root.style.setProperty('--color_bg_screen', 'radial-gradient(circle at 50% 52.5%, rgb(22, 22, 28) 0%, rgb(12, 12, 16) 90%)');
    root.style.setProperty('--color_bg_card', 'rgba(255, 255, 255, 0.07)');
    root.style.setProperty('--color_bg_card_hover', 'rgba(255, 255, 255, 0.11)');
    root.style.setProperty('--color_bg_input', 'rgba(255, 255, 255, 0.08)');
    root.style.setProperty('--color_border', 'rgba(255, 255, 255, 0.12)');
    root.style.setProperty('--color_border_light', 'rgba(255, 255, 255, 0.08)');
    root.style.setProperty('--color_text_primary', 'rgba(255, 255, 255, 1)');
    root.style.setProperty('--color_text_secondary', 'rgba(255, 255, 255, 0.9)');
    root.style.setProperty('--color_text_muted', 'rgba(255, 255, 255, 0.7)');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0c0c10');
    root.style.setProperty('--safe_area_bg', 'rgb(12, 12, 16)');
  }
}

/* ------------------------------------------------------------------ */
/* ThemeController                                                      */
/* ------------------------------------------------------------------ */

let _debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const ThemeController = {
  /** Read stored hue from localStorage, fallback to default. */
  getStored(): number {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return typeof user.themeHue === 'number' ? user.themeHue : DEFAULT_HUE;
    } catch {
      return DEFAULT_HUE;
    }
  },

  /** Read stored special theme from localStorage. */
  getStoredSpecial(): SpecialTheme | null {
    const v = localStorage.getItem('themeSpecial');
    return v === 'dark' || v === 'light' ? v : null;
  },

  /**
   * Called once before React renders — apply stored theme immediately.
   * Special theme takes priority over hue-based theme.
   */
  init(): void {
    const root = document.documentElement;
    const special = this.getStoredSpecial();
    if (special) {
      applySpecialTheme(root, special);
    } else {
      applyHueTheme(root, this.getStored());
    }
  },

  /**
   * Apply hue theme + sync localStorage.
   * Used by AuthContext on login/restore.
   */
  apply(hue: number): void {
    const root = document.documentElement;
    const special = this.getStoredSpecial();
    if (special) {
      applySpecialTheme(root, special);
    } else {
      applyHueTheme(root, hue);
    }
    this._syncLocalStorage(hue);
    document.dispatchEvent(new CustomEvent('themechange'));
  },

  /**
   * Apply hue theme + sync localStorage + debounced API save.
   * Clears special theme — user explicitly picked a hue color.
   * Used when the user picks a color in SettingsTab.
   */
  change(hue: number): void {
    localStorage.removeItem('themeSpecial');
    applyHueTheme(document.documentElement, hue);
    this._syncLocalStorage(hue);
    document.dispatchEvent(new CustomEvent('themechange'));
    if (_debounceTimer) clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => {
      profileApi.updateProfile({ themeHue: hue }).catch(() => {});
    }, 500);
  },

  /**
   * Apply a special standalone theme (near-black or ivory).
   * Saves to localStorage immediately.
   */
  changeSpecial(type: SpecialTheme): void {
    localStorage.setItem('themeSpecial', type);
    applySpecialTheme(document.documentElement, type);
    document.dispatchEvent(new CustomEvent('themechange'));
  },

  /** Reset to default hue theme and clear special theme. Used on logout. */
  reset(): void {
    localStorage.removeItem('themeSpecial');
    applyHueTheme(document.documentElement, DEFAULT_HUE);
    this._syncLocalStorage(DEFAULT_HUE);
    document.dispatchEvent(new CustomEvent('themechange'));
  },

  /** Write themeHue into the existing user object in localStorage. */
  _syncLocalStorage(hue: number): void {
    try {
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, themeHue: hue }));
    } catch {}
  },
};
