/**
 * ThemeController — single source of truth for theme management.
 *
 * Rules:
 *  - Only this module reads/writes themeHue in localStorage.
 *  - Only this module calls applyTheme().
 *  - External code calls ThemeController methods only.
 */
import { applyTheme, DEFAULT_HUE } from './theme';
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

  /** Called once before React renders — apply stored theme immediately. */
  init(): void {
    applyTheme(this.getStored());
  },

  /**
   * Apply theme + sync localStorage.
   * Used by AuthContext on login/restore (no API call needed — server already knows).
   */
  apply(hue: number): void {
    applyTheme(hue);
    this._syncLocalStorage(hue);
  },

  /**
   * Apply theme + sync localStorage + debounced API save.
   * Used when the user picks a color in SettingsTab.
   */
  change(hue: number): void {
    applyTheme(hue);
    this._syncLocalStorage(hue);
    if (_debounceTimer) clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => {
      profileApi.updateProfile({ themeHue: hue }).catch(() => {});
    }, 500);
  },

  /** Reset to default and clear stored hue. Used on logout. */
  reset(): void {
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
