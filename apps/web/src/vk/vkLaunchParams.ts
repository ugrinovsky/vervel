import { AUX_OAUTH_LAUNCH_BUNDLE_KEY } from '@/auth/auxiliarySessionStorage';

/** Ключ sessionStorage для сохранения launch-параметров встроенного OAuth (значение — в `auth/auxiliarySessionStorage`). */
export const EMBED_OAUTH_LAUNCH_SESSION_KEY = AUX_OAUTH_LAUNCH_BUNDLE_KEY;

/**
 * Авто-логин из встроенного клиента (VK Mini App и т.п.). Выключить: `VITE_ENABLE_VK_MINI_APP=false`.
 */
export function isEmbeddedOAuthLaunchEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_VK_MINI_APP !== 'false';
}

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

export function peekEmbedOAuthLaunchInUrl(): boolean {
  const m = mergeLocationVkParams();
  return !!(m.sign && m.vk_app_id);
}

/** В URL/hash есть хотя бы один типичный параметр VK (ещё без полной пары sign+app). */
export function hasEmbedOAuthQueryMarkers(): boolean {
  const m = mergeLocationVkParams();
  return Object.keys(m).some((k) => k.startsWith('vk_') || k === 'sign');
}

export function takeVkLaunchParams(): Record<string, string> | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const fromUrl = mergeLocationVkParams();
  if (fromUrl.sign && fromUrl.vk_app_id) {
    sessionStorage.setItem(EMBED_OAUTH_LAUNCH_SESSION_KEY, JSON.stringify(fromUrl));
    return fromUrl;
  }
  try {
    const raw = sessionStorage.getItem(EMBED_OAUTH_LAUNCH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed?.sign && parsed?.vk_app_id ? parsed : null;
  } catch {
    return null;
  }
}

/** После успешного mini-app-login: убираем launch params из sessionStorage (SPA-навигация). */
export function clearEmbedOAuthLaunchBundle(): void {
  try {
    sessionStorage.removeItem(EMBED_OAUTH_LAUNCH_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

function hasStoredVkLaunch(): boolean {
  try {
    const raw = sessionStorage.getItem(EMBED_OAUTH_LAUNCH_SESSION_KEY);
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
 * Нужно ли пытаться автологин мини-приложения: полные launch params в URL/hash или в sessionStorage,
 * iframe (VK часто режет Referrer — не требуем referrer для iframe),
 * или переход с vk.com / m.vk.ru / vk.ru в топ-окне (моб. веб открывает приложение без query в URL).
 * Частичные `vk_*` в URL без пары sign+vk_app_id не считаем — иначе ложный «вход через VK» на обычном сайте.
 */
export function hasEmbeddedOAuthLaunchContext(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  if (!isEmbeddedOAuthLaunchEnabled()) {
    return false;
  }
  if (peekEmbedOAuthLaunchInUrl() || hasStoredVkLaunch()) {
    return true;
  }
  try {
    if (window.parent !== window) {
      return true;
    }
  } catch {
    /* ignore */
  }
  if (isLikelyVkParentReferrer()) {
    return true;
  }
  return false;
}
