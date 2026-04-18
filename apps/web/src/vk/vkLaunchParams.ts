/** Параметры первого захода из VK Mini App (сохраняем при SPA-навигации). */
export const VK_LAUNCH_PARAMS_SESSION_KEY = 'vervel_vk_mini_launch_params';

export function peekVkMiniAppFromUrl(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const q = new URLSearchParams(window.location.search);
  return !!(q.get('sign') && q.get('vk_app_id'));
}

export function takeVkLaunchParams(): Record<string, string> | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const url = new URLSearchParams(window.location.search);
  const fromUrl: Record<string, string> = {};
  url.forEach((v, k) => {
    fromUrl[k] = v;
  });
  if (fromUrl.sign && fromUrl.vk_app_id) {
    sessionStorage.setItem(VK_LAUNCH_PARAMS_SESSION_KEY, JSON.stringify(fromUrl));
    return fromUrl;
  }
  try {
    const raw = sessionStorage.getItem(VK_LAUNCH_PARAMS_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed?.sign && parsed?.vk_app_id ? parsed : null;
  } catch {
    return null;
  }
}

export function clearVkLaunchParamsStorage(): void {
  try {
    sessionStorage.removeItem(VK_LAUNCH_PARAMS_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

function hasStoredVkLaunch(): boolean {
  try {
    const raw = sessionStorage.getItem(VK_LAUNCH_PARAMS_SESSION_KEY);
    if (!raw) return false;
    const o = JSON.parse(raw) as Record<string, string>;
    return !!(o?.sign && o?.vk_app_id);
  } catch {
    return false;
  }
}

/** Есть ли параметры запуска мини-приложения (без записи в sessionStorage). */
export function hasVkMiniAppLaunchContext(): boolean {
  return peekVkMiniAppFromUrl() || hasStoredVkLaunch();
}
