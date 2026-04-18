import { useEffect, useState, useRef } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthUser } from '@/contexts/AuthContext';
import { publicApi } from '@/api/http/publicApi';
import {
  bridgeLaunchParamsToRecord,
  clearVkLaunchParamsStorage,
  hasVkMiniAppLaunchContext,
  takeVkLaunchParams,
  VK_LAUNCH_PARAMS_SESSION_KEY,
} from '@/vk/vkLaunchParams';

type VkBootStatus = 'pending' | 'ready';

interface MiniAppLoginResponse {
  user?: { id: number; email: string; fullName: string; role: string; themeHue?: number | null };
  needsRole?: boolean;
  userId?: number;
}

function vkMiniDbg(...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.info('[vk-mini-app]', ...args);
  }
}

function miniLoginErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const d = err.response?.data as { message?: string } | undefined;
    if (d?.message && typeof d.message === 'string') return d.message;
    if (err.response?.status === 503) {
      return 'Сервер: не задан VK_MINI_APP_SECRET (мини-приложение не настроено).';
    }
    if (err.response?.status === 403) {
      return 'Неверная подпись запуска или vk_app_id. Проверь секрет и VK_MINI_APP_ID в API.';
    }
    return err.message || `HTTP ${err.response?.status ?? '?'}`;
  }
  if (err instanceof Error) return err.message;
  return 'Не удалось войти через VK Mini App';
}

/**
 * В VK Mini App: VKWebAppInit, параметры из URL/hash/sessionStorage или VKWebAppGetLaunchParams,
 * затем POST /oauth/vk/mini-app-login.
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
        const bridgeMod = await import('@vkontakte/vk-bridge');
        const bridge = bridgeMod.default;

        await bridge.send('VKWebAppInit');
        vkMiniDbg('VKWebAppInit ok');

        let launchParams = takeVkLaunchParams();
        vkMiniDbg('params from URL/session', launchParams ? Object.keys(launchParams) : null);

        if (!launchParams?.sign && bridge.isEmbedded()) {
          try {
            const raw = await bridge.send('VKWebAppGetLaunchParams');
            vkMiniDbg('VKWebAppGetLaunchParams raw keys', raw && typeof raw === 'object' ? Object.keys(raw) : raw);
            if (raw && typeof raw === 'object') {
              const fromBridge = bridgeLaunchParamsToRecord(raw as Record<string, unknown>);
              if (fromBridge.sign && fromBridge.vk_app_id) {
                launchParams = fromBridge;
                sessionStorage.setItem(VK_LAUNCH_PARAMS_SESSION_KEY, JSON.stringify(fromBridge));
              }
            }
          } catch (e) {
            vkMiniDbg('VKWebAppGetLaunchParams failed', e);
          }
        }

        if (!launchParams?.sign) {
          vkMiniDbg('no sign — skip mini-app login (не iframe VK или нет launch params)');
          return;
        }

        const res = await publicApi.post<MiniAppLoginResponse>('/oauth/vk/mini-app-login', {
          launchParams,
        });
        const data = res.data;
        clearVkLaunchParamsStorage();
        vkMiniDbg('mini-app-login OK', data.needsRole ? 'needsRole' : 'user');

        if (data.needsRole && data.userId != null) {
          navigateRef.current(`/select-role?userId=${data.userId}`, { replace: true });
          return;
        }
        if (data.user) {
          loginRef.current(data.user as AuthUser);
          navigateRef.current('/home', { replace: true });
        }
      } catch (err) {
        vkMiniDbg('mini-app login error', err);
        const msg = miniLoginErrorMessage(err);
        toast.error(msg);
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
