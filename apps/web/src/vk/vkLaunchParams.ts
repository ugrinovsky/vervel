/** Параметры первого захода из VK Mini App (сохраняем при SPA-навигации). */
export const VK_LAUNCH_PARAMS_SESSION_KEY = 'vervel_vk_mini_launch_params';

/**
 * Опционально: `athlete` | `trainer` — уходит только в POST /oauth/vk/mini-app-login как `initialRole`.
 * Входы вне VK Mini App по-прежнему используют экран /select-role при отсутствии роли.
 */
export const VK_MINI_APP_INITIAL_ROLE_KEY = 'vervel_vk_mini_initial_role';

/**
 * Сырой query для проверки подписи на API (как в examples/node.js для строки search):
 * без decode/rebuild — избегает расхождений с JSON из bridge.
 */
export function getVkLaunchRawQueryForVerify(): string | undefined {
  const segments = collectQuerySegmentsFromLocation();
  const first = segments[0];
  return first && first.length > 0 ? first : undefined;
}

/** Сегменты query: ?… из location.search и из hash (#…?… или #vk_app_id=…). */
function collectQuerySegmentsFromLocation(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }
  const { search, hash } = window.location;
  const out: string[] = [];
  if (search.length > 1) {
    out.push(search.slice(1));
  }
  if (hash) {
    const h = hash.startsWith('#') ? hash.slice(1) : hash;
    const q = h.indexOf('?');
    if (q >= 0) {
      out.push(h.slice(q + 1));
    } else if (h.includes('=') && !h.includes('/')) {
      out.push(h);
    }
  }
  return out;
}

/** Все пары ключ=значение из query и hash (строки, как в URL). */
export function mergeLocationVkParams(): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const seg of collectQuerySegmentsFromLocation()) {
    new URLSearchParams(seg).forEach((v, k) => {
      merged[k] = v;
    });
  }
  return merged;
}

export function peekVkMiniAppFromUrl(): boolean {
  const m = mergeLocationVkParams();
  return !!(m.sign && m.vk_app_id);
}

/** В URL/hash есть хотя бы один типичный параметр VK (ещё без полной пары sign+app). */
export function hasVkMiniAppQueryMarkers(): boolean {
  const m = mergeLocationVkParams();
  return Object.keys(m).some((k) => k.startsWith('vk_') || k === 'sign');
}

export function takeVkLaunchParams(): Record<string, string> | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const fromUrl = mergeLocationVkParams();
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
    sessionStorage.removeItem(VK_MINI_APP_INITIAL_ROLE_KEY);
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

/** Ответ VKWebAppGetLaunchParams → плоский Record<string, string> для API. */
export function bridgeLaunchParamsToRecord(data: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'object') continue;
    if (typeof v === 'boolean' && k.startsWith('vk_')) {
      out[k] = v ? '1' : '0';
      continue;
    }
    out[k] = String(v);
  }
  return out;
}

function isLikelyVkParentReferrer(): boolean {
  try {
    const ref = document.referrer || '';
    return /\.vk\.(com|ru)\b/i.test(ref) || /^(https?:)?\/\/(m\.|web\.)?vk\./i.test(ref);
  } catch {
    return false;
  }
}

/**
 * Нужно ли пытаться автологин мини-приложения: полные launch params, маркеры в URL,
 * сохранённые params или iframe с родителем VK.
 */
export function hasVkMiniAppLaunchContext(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  if (peekVkMiniAppFromUrl() || hasStoredVkLaunch() || hasVkMiniAppQueryMarkers()) {
    return true;
  }
  try {
    if (window.parent !== window && isLikelyVkParentReferrer()) {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}
