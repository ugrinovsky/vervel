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
      ) => Promise<{ handler: () => Promise<unknown> }>;
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

export default function YandexIdButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleToken(accessToken: string) {
    try {
      const res = await publicApi.post<{
        user: { id: number; email: string; fullName: string; role: string };
        token: any;
        needsRole?: boolean;
        tempToken?: string;
        userId?: number;
      }>('/oauth/yandex/sdk-login', { accessToken });

      const data = res.data;

      if (data.needsRole) {
        navigate(`/select-role?userId=${data.userId}`);
        return;
      }

      login(data.user as any);
      toast.success(`Добро пожаловать, ${data.user.fullName}!`);
      navigate('/');
    } catch {
      toast.error('Ошибка авторизации через Яндекс');
    }
  }

  // Handle full-page redirect fallback (?ya_token=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const yaToken = params.get('ya_token');
    if (!yaToken) return;
    window.history.replaceState({}, '', window.location.pathname);
    handleToken(yaToken);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !YANDEX_CLIENT_ID) return;

    // Listen for token from popup via BroadcastChannel
    const channel = new BroadcastChannel('ya_oauth');
    channel.onmessage = (event) => {
      const token = event.data?.ya_access_token;
      if (token) handleToken(token);
    };

    const container = containerRef.current;
    const containerId = 'ya-auth-suggest-container';
    container.id = containerId;

    const origin = window.location.origin;

    loadScript()
      .then(() => {
        if (!window.YaAuthSuggest) return;
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
          }
        );
      })
      .then((result) => result?.handler())
      .catch((error) => {
        if (error?.code === 'in_progress') return;
        console.error('YaAuthSuggest error:', error);
        if (error?.type !== 'not_authorized') {
          toast.error('Ошибка авторизации через Яндекс');
        }
      });

    return () => {
      channel.close();
      container.innerHTML = '';
      container.removeAttribute('id');
    };
  }, []);

  if (!YANDEX_CLIENT_ID) return null;

  return <div ref={containerRef} className="w-full" />;
}
