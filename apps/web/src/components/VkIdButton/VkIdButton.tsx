import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import * as VKID from '@vkid/sdk';
import { useAuth } from '@/contexts/AuthContext';
import { publicApi } from '@/api/http/publicApi';
import toast from 'react-hot-toast';

const VK_APP_ID = Number(import.meta.env.VITE_VK_APP_ID) || 54455065;

/** VKID.Config.init must run once per page; OneTap is created per mount (Strict Mode–safe). */
let vkSdkConfigInitialized = false;

export default function VkIdButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // redirectUrl must match one of the authorized URLs in VK app settings
    // For dev: add http://localhost:5173 in https://vk.com/editapp?id=54455065
    const redirectUrl =
      import.meta.env.VITE_APP_URL || `${window.location.origin}${window.location.pathname}`;

    if (!vkSdkConfigInitialized) {
      VKID.Config.init({
        app: VK_APP_ID,
        redirectUrl,
        responseMode: VKID.ConfigResponseMode.Callback,
        source: VKID.ConfigSource.LOWCODE,
        scope: '',
      });
      vkSdkConfigInitialized = true;
    }

    const oneTap = new VKID.OneTap();
    oneTap
      .render({
        container: el,
        fastAuthEnabled: false,
        showAlternativeLogin: false,
      })
      .on(VKID.WidgetEvents.ERROR, () => {
        toast.error('Ошибка авторизации через VK');
      })
      .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, async (payload: unknown) => {
        try {
          const { code, device_id } = payload as { code: string; device_id: string };
          const exchanged = await VKID.Auth.exchangeCode(code, device_id);

          const res = await publicApi.post<{
            user: { id: number; email: string; fullName: string; role: string };
            token: any;
            needsRole?: boolean;
            tempToken?: string;
            userId?: number;
          }>('/oauth/vk/sdk-login', {
            accessToken: (exchanged as any).access_token,
            userId: (exchanged as any).user_id,
          });

          const data = res.data;

          if (data.needsRole) {
            navigate(`/select-role?userId=${data.userId}`);
            return;
          }

          login(data.user as any);
        } catch {
          toast.error('Не удалось войти через VK');
        }
      });

    return () => {
      try {
        (oneTap as { destroy?: () => void }).destroy?.();
      } catch {
        /* ignore */
      }
      el.innerHTML = '';
    };
  }, [login, navigate]);

  return <div ref={containerRef} className="w-full" />;
}
