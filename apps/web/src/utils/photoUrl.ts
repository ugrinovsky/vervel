const API_BASE = import.meta.env.VITE_API_URL || '';

export function resolvePhotoUrl(photoUrl: string | null | undefined): string | null {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('http')) return photoUrl;
  return `${API_BASE}${photoUrl}`;
}
