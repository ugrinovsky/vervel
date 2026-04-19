import type { ReactNode } from 'react';
import { useVkMiniAppAuth } from './useVkMiniAppAuth';
import { isVkMiniAppIntegrationEnabled } from '@/vk/vkLaunchParams';

/**
 * Оборачивает приложение: при старте VK Mini App — «Вход через VK…», пока не завершится bootstrap.
 * Основной `AppContent` не знает про VK — только про `children`.
 *
 * Отключение: `VITE_ENABLE_VK_MINI_APP=false` — рендер только `children` (хук не монтируется).
 */
export default function VkMiniAppGate({ children }: { children: ReactNode }) {
  if (!isVkMiniAppIntegrationEnabled()) {
    return <>{children}</>;
  }
  return <VkMiniAppGateActive>{children}</VkMiniAppGateActive>;
}

function VkMiniAppGateActive({ children }: { children: ReactNode }) {
  const { vkBootStatus } = useVkMiniAppAuth();

  if (vkBootStatus === 'pending') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-950 text-zinc-200">
        <p className="text-sm">Вход через VK…</p>
      </div>
    );
  }

  return <>{children}</>;
}
