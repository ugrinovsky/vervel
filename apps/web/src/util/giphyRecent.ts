import type { GiphyKind, GiphySearchItem } from '@/api/chat';

const STORAGE_PREFIX = 'vervel:giphy_recent:';
const MAX_ITEMS = 30;

function isTrustedGiphyMediaUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    return h === 'media.giphy.com' || h.endsWith('.giphy.com');
  } catch {
    return false;
  }
}

function parseStored(raw: unknown): GiphySearchItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : '';
  const previewUrl = typeof o.previewUrl === 'string' ? o.previewUrl : '';
  const url = typeof o.url === 'string' ? o.url : '';
  if (!id || !isTrustedGiphyMediaUrl(previewUrl) || !isTrustedGiphyMediaUrl(url)) return null;
  const previewWidth = typeof o.previewWidth === 'number' ? o.previewWidth : undefined;
  const previewHeight = typeof o.previewHeight === 'number' ? o.previewHeight : undefined;
  return { id, previewUrl, url, previewWidth, previewHeight };
}

export function loadGiphyRecent(kind: GiphyKind): GiphySearchItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + kind);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: GiphySearchItem[] = [];
    for (const row of parsed) {
      const item = parseStored(row);
      if (item) out.push(item);
    }
    return out.slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function saveGiphyRecent(kind: GiphyKind, items: GiphySearchItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + kind, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    /* quota / private mode */
  }
}

/** Добавить в начало, убрать дубликаты по id, обрезать лимит. Возвращает актуальный список. */
export function pushGiphyRecent(kind: GiphyKind, item: GiphySearchItem): GiphySearchItem[] {
  const prev = loadGiphyRecent(kind);
  const next = [item, ...prev.filter((x) => x.id !== item.id)].slice(0, MAX_ITEMS);
  saveGiphyRecent(kind, next);
  return next;
}

export function clearGiphyRecent(kind: GiphyKind): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_PREFIX + kind);
  } catch {
    /* ignore */
  }
}

/** Удалить одну запись по id; возвращает новый список. */
export function removeGiphyRecentById(kind: GiphyKind, id: string): GiphySearchItem[] {
  const prev = loadGiphyRecent(kind);
  const next = prev.filter((x) => x.id !== id);
  saveGiphyRecent(kind, next);
  return next;
}
