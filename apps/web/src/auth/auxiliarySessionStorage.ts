/**
 * Session keys for optional third-party OAuth launch flows.
 * Сейчас использует только интеграция VK Mini App; ядро приложения импортирует только этот модуль,
 * без `@/vk/*`, чтобы веб оставался самодостаточным и папку `vk/` можно было удалить отдельно.
 */
export const AUX_OAUTH_LAUNCH_BUNDLE_KEY = 'vervel_vk_mini_launch_params';

/** Раньше использовался буфер роли для VK Mini App — очищаем при logout/401. */
const LEGACY_AUX_OAUTH_INITIAL_ROLE_KEY = 'vervel_vk_mini_initial_role';

export function clearAuxiliaryOAuthSessionStorage(): void {
  try {
    sessionStorage.removeItem(AUX_OAUTH_LAUNCH_BUNDLE_KEY);
    sessionStorage.removeItem(LEGACY_AUX_OAUTH_INITIAL_ROLE_KEY);
  } catch {
    /* ignore */
  }
}
