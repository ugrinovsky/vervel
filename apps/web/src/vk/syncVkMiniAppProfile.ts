import { privateApi } from '@/api/http/privateApi';
import type { AuthUser } from '@/contexts/AuthContext';

/** default export пакета — инстанс моста (значение); тип берём через typeof. */
type VkBridgeInstance = typeof import('@vkontakte/vk-bridge').default;

type VkUserInfo = {
  first_name?: string;
  last_name?: string;
  photo_100?: string;
  photo_200?: string;
  photo_max_orig?: string;
  sex?: number;
};

/**
 * После mini-app-login: имя, фото и пол из `VKWebAppGetUserInfo` → PUT /profile (сервер фильтрует photoUrl по CDN VK).
 */
export async function syncVkMiniAppProfileFromBridge(bridge: VkBridgeInstance): Promise<Partial<AuthUser> | null> {
  const raw = (await bridge.send('VKWebAppGetUserInfo')) as VkUserInfo;
  const first = raw?.first_name?.trim() ?? '';
  const last = raw?.last_name?.trim() ?? '';
  const fullName = [first, last].filter(Boolean).join(' ').trim();
  const photoUrl = [raw?.photo_200, raw?.photo_100, raw?.photo_max_orig].find(
    (u): u is string => typeof u === 'string' && u.length > 0,
  );
  let gender: 'male' | 'female' | undefined;
  if (raw?.sex === 2) {
    gender = 'male';
  } else if (raw?.sex === 1) {
    gender = 'female';
  }

  const body: Record<string, string> = {};
  if (fullName) {
    body.fullName = fullName;
  }
  if (photoUrl) {
    body.photoUrl = photoUrl;
  }
  if (gender) {
    body.gender = gender;
  }

  if (Object.keys(body).length === 0) {
    return null;
  }

  const res = await privateApi.put<{ success: boolean; data: { user: AuthUser } }>('/profile', body);
  const u = res.data.data?.user;
  if (!u) {
    return null;
  }
  return {
    fullName: u.fullName,
    photoUrl: u.photoUrl ?? undefined,
    gender: u.gender ?? undefined,
  };
}
