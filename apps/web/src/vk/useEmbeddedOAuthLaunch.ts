import { useEffect, useState, useRef } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthUser } from '@/contexts/AuthContext';
import { publicApi } from '@/api/http/publicApi';
import {
  bridgeLaunchParamsToRecord,
  clearEmbedOAuthLaunchBundle,
  getVkLaunchRawQueryForVerify,
  hasEmbeddedOAuthLaunchContext,
  takeVkLaunchParams,
  EMBED_OAUTH_LAUNCH_SESSION_KEY,
} from '@/vk/vkLaunchParams';
import { syncVkMiniAppProfileFromBridge } from '@/vk/syncVkMiniAppProfile';

type EmbedLaunchBootStatus = 'pending' | 'ready';

interface MiniAppLoginResponse {
  user?: { id: number; email: string; fullName: string; role: string; themeHue?: number | null };
  needsRole?: boolean;
  userId?: number;
}

function embedOAuthDbg(...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.info('[embed-oauth]', ...args);
  }
}

function miniLoginErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const d = err.response?.data as { message?: string } | undefined;
    if (d?.message && typeof d.message === 'string') return d.message;
    if (err.response?.status === 503) {
      return 'Сервер: не настроен защищённый ключ для встроенного входа (см. env API).';
    }
    if (err.response?.status === 403) {
      return 'Неверная подпись или идентификатор приложения. Проверь настройки API.';
    }
    return err.message || `HTTP ${err.response?.status ?? '?'}`;
  }
  if (err instanceof Error) return err.message;
  return 'Не удалось войти из встроенного приложения';
}

/**
 * Встроенный клиент: мост, launch params → POST /oauth/vk/mini-app-login.
 * Роль — только через `/select-role` (как у остального OAuth).
 */
export function useEmbeddedOAuthLaunch(): { launchBootStatus: EmbedLaunchBootStatus } {
  const { login } = useAuth();
  const navigate = useNavigate();
  const loginRef = useRef(login);
  const navigateRef = useRef(navigate);
  loginRef.current = login;
  navigateRef.current = navigate;

  const [launchBootStatus, setLaunchBootStatus] = useState<EmbedLaunchBootStatus>(() =>
    typeof window !== 'undefined' && hasEmbeddedOAuthLaunchContext() ? 'pending' : 'ready',
  );

  useEffect(() => {
    if (!hasEmbeddedOAuthLaunchContext()) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const bridgeMod = await import('@vkontakte/vk-bridge');
        const bridge = bridgeMod.default;

        try {
          await bridge.send('VKWebAppInit');
          embedOAuthDbg('bridge init ok');
        } catch (e) {
          embedOAuthDbg('bridge init skipped', e);
        }

        let launchParams = takeVkLaunchParams();
        embedOAuthDbg('params from URL/session', launchParams ? Object.keys(launchParams) : null);

        if (!launchParams?.sign) {
          try {
            const raw = await bridge.send('VKWebAppGetLaunchParams');
            embedOAuthDbg('launch params from bridge', raw && typeof raw === 'object' ? Object.keys(raw) : raw);
            if (raw && typeof raw === 'object') {
              const fromBridge = bridgeLaunchParamsToRecord(raw as Record<string, unknown>);
              if (fromBridge.sign && fromBridge.vk_app_id) {
                launchParams = fromBridge;
                sessionStorage.setItem(EMBED_OAUTH_LAUNCH_SESSION_KEY, JSON.stringify(fromBridge));
              }
            }
          } catch (e) {
            embedOAuthDbg('launch params from bridge failed', e);
          }
        }

        if (!launchParams?.sign) {
          embedOAuthDbg('no sign — skip embed login');
          return;
        }

        const launchQuery = getVkLaunchRawQueryForVerify();
        embedOAuthDbg('launchQuery for verify', launchQuery ? '(present)' : '(absent)');
        console.info('[vk-mini-app-login payload]', {
          launchParams,
          launchQuery: launchQuery || null,
          locationSearch: window.location.search,
        });

        if (cancelled) {
          return;
        }
        setLaunchBootStatus('pending');

        const res = await publicApi.post<MiniAppLoginResponse>('/oauth/vk/mini-app-login', {
          launchParams,
          ...(launchQuery ? { launchQuery } : {}),
        });
        if (cancelled) {
          return;
        }
        const data = res.data;
        clearEmbedOAuthLaunchBundle();
        embedOAuthDbg('mini-app-login OK', data.needsRole ? 'needsRole' : 'user');

        if (data.needsRole && data.userId != null) {
          navigateRef.current(`/select-role?userId=${data.userId}`, { replace: true });
          return;
        }
        if (data.user) {
          let authed = data.user as AuthUser;
          if (bridge.isEmbedded()) {
            try {
              const patched = await syncVkMiniAppProfileFromBridge(bridge);
              if (patched) {
                authed = { ...authed, ...patched };
              }
            } catch (e) {
              embedOAuthDbg('profile sync from bridge failed', e);
            }
          }
          if (cancelled) {
            return;
          }
          loginRef.current(authed);
          navigateRef.current('/home', { replace: true });
        }
      } catch (err) {
        embedOAuthDbg('embed login error', err);
        if (isAxiosError(err)) {
          console.error('[vk-mini-app-login error]', {
            status: err.response?.status ?? null,
            data: err.response?.data ?? null,
          });
        } else {
          console.error('[vk-mini-app-login error]', err);
        }
        const msg = miniLoginErrorMessage(err);
        toast.error(msg);
      } finally {
        if (!cancelled) {
          setLaunchBootStatus('ready');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { launchBootStatus };
}
