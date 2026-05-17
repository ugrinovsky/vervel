import toast from 'react-hot-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import {
  isPwaStandalone,
  detectPwaPlatform,
  isMobileBrowser,
} from '@/components/PwaInstallHint/pwaInstallShared';
import { PwaInstructions } from '@/components/PwaInstallHint/PwaInstallHint';
import Button from '@/components/ui/Button';

/**
 * Общий блок PWA + web push для финального шага онбординга (атлет / тренер).
 */
export default function OnboardingPwaPushSection() {
  const {
    permission: pushPermission,
    loading: pushLoading,
    enable: enablePush,
    supported: pushSupported,
  } = usePushNotifications();
  const isStandalone = isPwaStandalone();
  const pwaPlatform = detectPwaPlatform();

  const handleEnablePush = async () => {
    await enablePush();
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      toast.success('Уведомления включены');
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto w-full max-w-md mx-auto space-y-3 mb-4 text-left">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 px-0.5">
        По желанию
      </p>
      {!isStandalone && (isMobileBrowser() || !pushSupported) ? (
        <div className="glass rounded-2xl p-4">
          <p className="text-sm font-semibold text-white mb-1">Иконка на главном экране</p>
          <PwaInstructions platform={pwaPlatform} />
        </div>
      ) : pushSupported ? (
        <div className="glass rounded-2xl p-4">
          <p className="text-sm font-semibold text-white mb-1">Уведомления</p>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-(--color_text_muted) flex-1 min-w-0">
              {pushPermission === 'granted' && 'Включены — напоминания о сообщениях и тренировках'}
              {pushPermission === 'default' &&
                'Напоминания о сообщениях и тренировках — можно включить сейчас'}
              {pushPermission === 'denied' &&
                'Заблокированы в браузере — разрешите в настройках сайта'}
            </p>
            {pushPermission !== 'denied' && (
              <Button
                type="button"
                variant="unstyled"
                onClick={() => void handleEnablePush()}
                disabled={pushLoading || pushPermission === 'granted'}
                className="shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-50"
                style={{
                  background:
                    pushPermission === 'granted'
                      ? 'var(--color_bg_card_hover)'
                      : 'var(--color_primary_light)',
                  color: 'white',
                }}
              >
                {pushLoading ? '...' : pushPermission === 'granted' ? 'Включены' : 'Включить'}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-(--color_text_muted) px-1">
          Уведомления в этом браузере недоступны. Откройте приложение в Chrome или Safari с
          телефона.
        </p>
      )}
    </div>
  );
}
