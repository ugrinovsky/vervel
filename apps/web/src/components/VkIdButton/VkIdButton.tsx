import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import './vkSdkStatsShim';
import * as VKID from '@vkid/sdk';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthUser } from '@/contexts/auth-types';
import type { ClientPreferences } from '@/types/clientPreferences';
import { publicApi } from '@/api/http/publicApi';
import toast from 'react-hot-toast';
import { isRecord } from '@/utils/typeGuards';
import { userRoleFromApiString } from '@/util/userRole';

const VK_APP_ID = Number(import.meta.env.VITE_VK_APP_ID) || 54455065;

/** Последние параметры Config.init — переинициализируем при смене, иначе exchangeCode шлёт старый redirect_uri. */
let lastVkInitKey = '';

/**
 * Должен **буквально** совпадать с «доверенным redirect URL» в ЛК VK (путь, www, http/https — как в кабинете).
 * `VITE_APP_URL` в проде или текущий URL страницы.
 */
function getVkIdRedirectUrl(): string {
  const raw = import.meta.env.VITE_APP_URL?.trim() || '';
  try {
    const u = raw
      ? new URL(raw)
      : new URL(`${window.location.origin}${window.location.pathname}`);
    u.hash = '';
    u.search = '';
    const path = u.pathname.replace(/\/+$/, '');
    return path ? `${u.origin}${path}` : u.origin;
  } catch {
    return `${window.location.origin}${window.location.pathname.replace(/\/+$/, '') || ''}`;
  }
}

function isVkLoginPayload(v: unknown): v is { code: string; device_id: string } {
  return isRecord(v) && typeof v.code === 'string' && typeof v.device_id === 'string';
}

function vkExchangePayload(v: unknown): { accessToken: string; userId: number | string } | null {
  if (!isRecord(v)) return null;
  const at = v.access_token;
  const uid = v.user_id;
  if (typeof at !== 'string') return null;
  if (typeof uid !== 'number' && typeof uid !== 'string') return null;
  return { accessToken: at, userId: uid };
}

type VkSdkLoginResponse = {
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
};

export default function VkIdButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const redirectUrl = getVkIdRedirectUrl();
    const initKey = `${VK_APP_ID}|${redirectUrl}`;
    if (initKey !== lastVkInitKey) {
      lastVkInitKey = initKey;
      VKID.Config.init({
        app: VK_APP_ID,
        redirectUrl,
        responseMode: VKID.ConfigResponseMode.Callback,
        source: VKID.ConfigSource.LOWCODE,
        scope: '',
      });
    }

    const oneTap = new VKID.OneTap();
    oneTap
      .render({
        container: el,
        fastAuthEnabled: false,
        showAlternativeLogin: false,
      })
      .on(VKID.WidgetEvents.ERROR, (err: unknown) => {
        const msg = isRecord(err) && typeof err.message === 'string' ? err.message : '';
        if (msg.includes('redirect_uri')) {
          const url = getVkIdRedirectUrl();
          toast.error(
            `VK: redirect_uri не совпадает с ЛК. Добавьте в VK точно: ${url} (и то же в VITE_APP_URL после пересборки фронта).`,
            { duration: 8000 },
          );
          return;
        }
        toast.error(msg || 'Ошибка авторизации через VK');
      })
      .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, async (payload: unknown) => {
        try {
          if (!isVkLoginPayload(payload)) {
            toast.error('Не удалось войти через VK');
            return;
          }
          const { code, device_id } = payload;
          const exchanged: unknown = await VKID.Auth.exchangeCode(code, device_id);
          const tokens = vkExchangePayload(exchanged);
          if (!tokens) {
            toast.error('Не удалось войти через VK');
            return;
          }

          const res = await publicApi.post<VkSdkLoginResponse>('/oauth/vk/sdk-login', {
            accessToken: tokens.accessToken,
            userId: tokens.userId,
          });

          const data = res.data;

          if (data.needsRole) {
            navigate(`/select-role?userId=${data.userId}`);
            return;
          }

          const role = userRoleFromApiString(data.user.role);
          if (!role) {
            toast.error('Не удалось войти через VK');
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
        } catch {
          toast.error('Не удалось войти через VK');
        }
      });

    return () => {
      try {
        if (isRecord(oneTap) && typeof oneTap.destroy === 'function') {
          oneTap.destroy();
        }
      } catch {
        /* ignore */
      }
      el.innerHTML = '';
    };
  }, [login, navigate]);

  return <div ref={containerRef} className="w-full" />;
}
