import type { ReactNode } from 'react';
import { useEmbeddedOAuthLaunch } from './useEmbeddedOAuthLaunch';
import { isEmbeddedOAuthLaunchEnabled } from '@/vk/vkLaunchParams';

/**
 * Оборачивает приложение: при авто-входе из встроенного клиента показывает сплэш до завершения bootstrap.
 * Отключение: `VITE_ENABLE_VK_MINI_APP=false`.
 */
export default function EmbeddedOAuthLaunchGate({ children }: { children: ReactNode }) {
  if (!isEmbeddedOAuthLaunchEnabled()) {
    return <>{children}</>;
  }
  return <EmbeddedOAuthLaunchGateActive>{children}</EmbeddedOAuthLaunchGateActive>;
}

function EmbeddedOAuthLaunchGateActive({ children }: { children: ReactNode }) {
  const { launchBootStatus } = useEmbeddedOAuthLaunch();

  if (launchBootStatus === 'pending') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-950 text-zinc-200">
        <p className="text-sm">Вход…</p>
      </div>
    );
  }

  return <>{children}</>;
}
