import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthUser } from '@/contexts/AuthContext';
import { publicApi } from '@/api/http/publicApi';
import {
  clearVkLaunchParamsStorage,
  hasVkMiniAppLaunchContext,
  takeVkLaunchParams,
} from '@/vk/vkLaunchParams';

type VkBootStatus = 'pending' | 'ready';

interface MiniAppLoginResponse {
  user?: { id: number; email: string; fullName: string; role: string; themeHue?: number | null };
  needsRole?: boolean;
  userId?: number;
}

/**
 * В VK Mini App: VKWebAppInit + обмен подписанных launch params на сессию API.
 * Без параметров VK сразу возвращает ready.
 */
export function useVkMiniAppAuth(): { vkBootStatus: VkBootStatus } {
  const { login } = useAuth();
  const navigate = useNavigate();
  const loginRef = useRef(login);
  const navigateRef = useRef(navigate);
  loginRef.current = login;
  navigateRef.current = navigate;

  const [vkBootStatus, setVkBootStatus] = useState<VkBootStatus>(() =>
    typeof window !== 'undefined' && hasVkMiniAppLaunchContext() ? 'pending' : 'ready',
  );

  useEffect(() => {
    if (!hasVkMiniAppLaunchContext()) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const launchParams = takeVkLaunchParams();
        if (!launchParams) {
          return;
        }

        const bridge = (await import('@vkontakte/vk-bridge')).default;
        await bridge.send('VKWebAppInit');

        const res = await publicApi.post<MiniAppLoginResponse>('/oauth/vk/mini-app-login', {
          launchParams,
        });
        const data = res.data;
        clearVkLaunchParamsStorage();

        if (data.needsRole && data.userId != null) {
          navigateRef.current(`/select-role?userId=${data.userId}`, { replace: true });
          return;
        }
        if (data.user) {
          loginRef.current(data.user as AuthUser);
          navigateRef.current('/home', { replace: true });
        }
      } catch {
        /* не в VK / неверная подпись / API не настроен — показываем обычный UI */
      } finally {
        if (!cancelled) {
          setVkBootStatus('ready');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { vkBootStatus };
}
