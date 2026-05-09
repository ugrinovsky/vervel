import { useCallback, useEffect, useId, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { publicApi } from '@/api/http/publicApi';
import toast from 'react-hot-toast';
import type { AuthUser } from '@/contexts/auth-types';
import type { ClientPreferences } from '@/types/clientPreferences';
import { userRoleFromApiString } from '@/util/userRole';

const YANDEX_CLIENT_ID = import.meta.env.VITE_YANDEX_CLIENT_ID || '';

declare global {
  interface Window {
    YaAuthSuggest?: {
      init: (
        params: Record<string, string>,
        origin: string,
        options: Record<string, unknown>
      ) => Promise<{ handler: () => Promise<unknown> }>;
    };
  }
}

let scriptLoaded = false;

const YANDEX_SUGGEST_SDK_SRC =
  import.meta.env.VITE_YANDEX_SDK_URL ||
  'https://yastatic.net/s3/passport-sdk/autofill/v1/sdk-suggest-with-polyfills-latest.js';

export const YANDEX_SDK_SCRIPT_LOAD_FAILED = 'yandex_sdk_script_load_failed';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Несколько попыток: yastatic.net иногда даёт ERR_CONNECTION_CLOSED (сеть / блокировки). */
async function loadScript(): Promise<void> {
  if (scriptLoaded || document.querySelector('#ya-suggest-sdk')) {
    return;
  }
  let lastErr: unknown = new Error(YANDEX_SDK_SCRIPT_LOAD_FAILED);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    document.getElementById('ya-suggest-sdk')?.remove();
    try {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.id = 'ya-suggest-sdk';
        script.src = YANDEX_SUGGEST_SDK_SRC;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(YANDEX_SDK_SCRIPT_LOAD_FAILED));
        document.head.appendChild(script);
      });
      scriptLoaded = true;
      return;
    } catch (e) {
      lastErr = e;
      if (attempt < 2) {
        await sleep(500 * (attempt + 1));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(YANDEX_SDK_SCRIPT_LOAD_FAILED);
}

export default function YandexIdButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestParentId = useId().replace(/:/g, '');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleToken = useCallback(
    async (accessToken: string) => {
      try {
        const res = await publicApi.post<{
          user: {
            id: number;
            email: string;
            fullName: string;
            role: string;
            themeHue?: number | null;
            clientPreferences?: ClientPreferences;
          };
          needsRole?: boolean;
          userId?: number;
        }>('/oauth/yandex/sdk-login', { accessToken });

        const data = res.data;

        if (data.needsRole) {
          navigate(`/select-role?userId=${data.userId}`);
          return;
        }

        const role = userRoleFromApiString(data.user.role);
        if (!role) {
          toast.error('Ошибка авторизации через Яндекс');
          return;
        }

        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.fullName,
          role,
          themeHue: data.user.themeHue,
          clientPreferences: data.user.clientPreferences,
        };
        login(authUser);
        toast.success(`Добро пожаловать, ${data.user.fullName}!`);
        navigate('/');
      } catch {
        toast.error('Ошибка авторизации через Яндекс');
      }
    },
    [login, navigate],
  );

  // Handle full-page redirect fallback (?ya_token=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const yaToken = params.get('ya_token');
    if (!yaToken) return;
    window.history.replaceState({}, '', window.location.pathname);
    void handleToken(yaToken);
  }, [handleToken]);

  useEffect(() => {
    if (!YANDEX_CLIENT_ID) return;

    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    const containerId = `ya-auth-suggest-${suggestParentId}`;

    // Listen for token from popup via BroadcastChannel
    const channel = new BroadcastChannel('ya_oauth');
    channel.onmessage = (event) => {
      const token = event.data?.ya_access_token;
      if (token) handleToken(token);
    };

    container.id = containerId;

    const origin = window.location.origin;

    loadScript()
      .then(() => {
        if (cancelled || containerRef.current !== container) return undefined;
        if (!document.getElementById(containerId)) return undefined;
        if (!window.YaAuthSuggest) return undefined;
        return window.YaAuthSuggest.init(
          {
            client_id: YANDEX_CLIENT_ID,
            response_type: 'token',
            redirect_uri: `${origin}/suggest/token`,
          },
          origin,
          {
            view: 'button',
            parentId: containerId,
            buttonSize: 'm',
            buttonView: 'main',
            buttonTheme: 'dark',
            buttonBorderRadius: '8',
            buttonIcon: 'ya',
          },
        );
      })
      .then((result) => {
        if (cancelled || containerRef.current !== container) return;
        if (!result) return;
        if (!document.getElementById(containerId)) return;
        return result.handler();
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error && typeof error === 'object' && 'code' in error && error.code === 'in_progress') {
          return;
        }
        console.error('YaAuthSuggest error:', error);
        if (
          error instanceof Error &&
          error.message === YANDEX_SDK_SCRIPT_LOAD_FAILED
        ) {
          toast.error(
            'Не удалось загрузить вход через Яндекс (сеть или блокировка). Попробуйте позже или другой способ входа.',
          );
        }
      });

    return () => {
      cancelled = true;
      channel.close();
      container.innerHTML = '';
      container.removeAttribute('id');
    };
  }, [handleToken, suggestParentId]);

  if (!YANDEX_CLIENT_ID) return null;

  return <div ref={containerRef} className="w-full" />;
}
