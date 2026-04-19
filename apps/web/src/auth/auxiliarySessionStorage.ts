/**
 * Ключи sessionStorage для опционального авто-логина из встроенного клиента (см. `vk/`).
 * Ядро импортирует только этот модуль, без `@/vk/*`.
 */
export const AUX_OAUTH_LAUNCH_BUNDLE_KEY = 'vervel_vk_mini_launch_params';

/** Устаревший ключ — очищаем при logout/401. */
const LEGACY_AUX_OAUTH_INITIAL_ROLE_KEY = 'vervel_vk_mini_initial_role';

export function clearAuxiliaryOAuthSessionStorage(): void {
  try {
    sessionStorage.removeItem(AUX_OAUTH_LAUNCH_BUNDLE_KEY);
    sessionStorage.removeItem(LEGACY_AUX_OAUTH_INITIAL_ROLE_KEY);
  } catch {
    /* ignore */
  }
}
