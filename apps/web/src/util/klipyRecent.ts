import type { KlipyKind, KlipySearchItem } from '@/api/chat';

const STORAGE_PREFIX = 'vervel:klipy_recent:';
const MAX_ITEMS = 30;

function isTrustedKlipyMediaUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    return h === 'media.klipy.com' || h.endsWith('.klipy.com');
  } catch {
    return false;
  }
}

function parseStored(raw: unknown): KlipySearchItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : '';
  const previewUrl = typeof o.previewUrl === 'string' ? o.previewUrl : '';
  const url = typeof o.url === 'string' ? o.url : '';
  if (!id || !isTrustedKlipyMediaUrl(previewUrl) || !isTrustedKlipyMediaUrl(url)) return null;
  const previewWidth = typeof o.previewWidth === 'number' ? o.previewWidth : undefined;
  const previewHeight = typeof o.previewHeight === 'number' ? o.previewHeight : undefined;
  return { id, previewUrl, url, previewWidth, previewHeight };
}

export function loadKlipyRecent(kind: KlipyKind): KlipySearchItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + kind);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: KlipySearchItem[] = [];
    for (const row of parsed) {
      const item = parseStored(row);
      if (item) out.push(item);
    }
    return out.slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function saveKlipyRecent(kind: KlipyKind, items: KlipySearchItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + kind, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    /* quota / private mode */
  }
}

export function pushKlipyRecent(kind: KlipyKind, item: KlipySearchItem): KlipySearchItem[] {
  const prev = loadKlipyRecent(kind);
  const next = [item, ...prev.filter((x) => x.id !== item.id)].slice(0, MAX_ITEMS);
  saveKlipyRecent(kind, next);
  return next;
}

export function clearKlipyRecent(kind: KlipyKind): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_PREFIX + kind);
  } catch {
    /* ignore */
  }
}

export function removeKlipyRecentById(kind: KlipyKind, id: string): KlipySearchItem[] {
  const prev = loadKlipyRecent(kind);
  const next = prev.filter((x) => x.id !== id);
  saveKlipyRecent(kind, next);
  return next;
}
