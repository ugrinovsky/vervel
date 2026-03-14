import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { publicApi } from '@/api/http/publicApi';
import toast from 'react-hot-toast';

const YANDEX_CLIENT_ID = import.meta.env.VITE_YANDEX_CLIENT_ID || '';

declare global {
  interface Window {
    YaAuthSuggest?: {
      init: (
        params: Record<string, string>,
        origin: string,
        options: Record<string, unknown>
      ) => Promise<{ handler: () => Promise<{ access_token?: string }> }>;
    };
  }
}

let scriptLoaded = false;

function loadScript(): Promise<void> {
  if (scriptLoaded || document.querySelector('#ya-suggest-sdk')) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'ya-suggest-sdk';
    script.src =
      'https://yastatic.net/s3/passport-sdk/autofill/v1/sdk-suggest-with-polyfills-latest.js';
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function handleYandexToken(
  accessToken: string,
  login: (user: any, token: string) => void,
  navigate: (path: string) => void
) {
  const res = await publicApi.post<{
    user: { id: number; email: string; fullName: string; role: string };
    token: any;
    needsRole?: boolean;
    tempToken?: string;
    userId?: number;
  }>('/oauth/yandex/sdk-login', { accessToken });

  const resData = res.data;

  if (resData.needsRole) {
    navigate(`/select-role?token=${resData.tempToken}&userId=${resData.userId}`);
    return;
  }

  login(resData.user as any, resData.token.token);
  toast.success(`Добро пожаловать, ${resData.user.fullName}!`);
  navigate('/');
}

export default function YandexIdButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Handle full-page redirect flow: /suggest/token redirects back with ?ya_token=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const yaToken = params.get('ya_token');
    if (!yaToken) return;

    window.history.replaceState({}, '', window.location.pathname);

    handleYandexToken(yaToken, login, navigate).catch(() => {
      toast.error('Ошибка авторизации через Яндекс');
    });
  }, []);

  // Handle popup/iframe flow via SDK
  useEffect(() => {
    if (!containerRef.current || !YANDEX_CLIENT_ID) return;

    const container = containerRef.current;
    const containerId = 'ya-auth-suggest-container';
    container.id = containerId;

    const origin = window.location.origin;
    const redirectUri = `${origin}/suggest/token`;

    loadScript()
      .then(() => {
        if (!window.YaAuthSuggest) return;

        return window.YaAuthSuggest.init(
          {
            client_id: YANDEX_CLIENT_ID,
            response_type: 'token',
            redirect_uri: redirectUri,
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
          }
        );
      })
      .then((result) => result?.handler())
      .then(async (data) => {
        if (!data?.access_token) return;
        await handleYandexToken(data.access_token, login, navigate);
      })
      .catch((error) => {
        console.error('YaAuthSuggest error:', error);
        if (error?.type !== 'not_authorized') {
          toast.error('Ошибка авторизации через Яндекс');
        }
      });

    return () => {
      container.innerHTML = '';
      container.removeAttribute('id');
    };
  }, []);

  if (!YANDEX_CLIENT_ID) return null;

  return <div ref={containerRef} className="w-full" />;
}
