/**
 * ThemeController — single source of truth for theme management.
 *
 * Rules:
 *  - Only this module reads/writes themeHue / themeSpecial in localStorage.
 *  - Only this module calls applyTheme() / applySpecialTheme().
 *  - External code calls ThemeController methods only.
 *
 * Two independent dimensions:
 *  1. Special theme: 'dark' | 'light' | null (null = use hue-based)
 *  2. Hue: number (accent color, used when specialTheme is null)
 */
import { applyTheme, applySpecialTheme, DEFAULT_HUE, type SpecialTheme } from './theme';
import { profileApi } from '@/api/profile';

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
    const special = this.getStoredSpecial();
    if (special) {
      applySpecialTheme(special);
    } else {
      applyTheme(this.getStored());
    }
  },

  /**
   * Apply hue theme + sync localStorage.
   * Also clears any active special theme.
   * Used by AuthContext on login/restore.
   */
  apply(hue: number): void {
    const special = this.getStoredSpecial();
    if (special) {
      applySpecialTheme(special);
    } else {
      applyTheme(hue);
    }
    this._syncLocalStorage(hue);
  },

  /**
   * Apply hue theme + sync localStorage + debounced API save.
   * Clears special theme — user explicitly picked a hue color.
   * Used when the user picks a color in SettingsTab.
   */
  change(hue: number): void {
    localStorage.removeItem('themeSpecial');
    applyTheme(hue);
    this._syncLocalStorage(hue);
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
    applySpecialTheme(type);
  },

  /** Reset to default hue theme and clear special theme. Used on logout. */
  reset(): void {
    localStorage.removeItem('themeSpecial');
    applyTheme(DEFAULT_HUE);
    this._syncLocalStorage(DEFAULT_HUE);
  },

  /** Write themeHue into the existing user object in localStorage. */
  _syncLocalStorage(hue: number): void {
    try {
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, themeHue: hue }));
    } catch {}
  },
};
