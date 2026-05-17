import { useState, useEffect } from 'react';
import { getApiErrorMessage } from '@/utils/apiError';
import { useParams, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { athleteApi } from '@/api/athlete';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureUnlock } from '@/hooks/useFeatureUnlock';
import AccentButton from '@/components/ui/AccentButton';
import ButtonLink from '@/components/ui/ButtonLink';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface InviteInfo {
  trainerName: string;
  trainerPhotoUrl: string | null;
  trainerSpecializations: string[] | null;
}

export default function InviteScreen() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const isLoggedIn = !!authUser;

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const { unlock } = useFeatureUnlock();

  useEffect(() => {
    if (!token) return;
    athleteApi
      .getInviteInfo(token)
      .then((res) => {
        if (res.data.success) setInfo(res.data.data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoadingInfo(false));
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      await athleteApi.acceptInvite(token);
      void unlock('invite_accepted');
      setAccepted(true);
      toast.success('Вы в команде тренера!');
      setTimeout(() => navigate('/my-team'), 1500);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Не удалось принять приглашение'));
    } finally {
      setAccepting(false);
    }
  };

  const initials = info?.trainerName?.[0]?.toUpperCase() || '?';

  if (loadingInfo) {
    return (
      <div className="min-h-screen bg-(--color_bg) flex items-center justify-center">
        <LoadingSpinner variant="soft" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-(--color_bg) flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-4">🔗</div>
        <h1 className="text-xl font-bold text-white mb-2">Ссылка недействительна</h1>
        <p className="text-sm text-(--color_text_muted) mb-6">
          Приглашение уже использовано или истекло
        </p>
        <ButtonLink to="/" size="lg" className="px-6">
          На главную
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--color_bg) flex flex-col items-center justify-center p-6">
      <AnimatePresence mode="wait">
        {accepted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-(--color_primary_light) flex items-center justify-center text-4xl">
              ✓
            </div>
            <h1 className="text-xl font-bold text-white">Вы в команде!</h1>
            <p className="text-sm text-(--color_text_muted)">Переходим в «Моя команда»…</p>
          </motion.div>
        ) : (
          <motion.div
            key="invite"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm"
          >
            {/* Card */}
            <div className="glass rounded-3xl p-8 text-center mb-4">
              {/* Trainer photo */}
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-(--color_primary_light) to-(--color_primary) flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                  {info?.trainerPhotoUrl ? (
                    <img
                      src={info.trainerPhotoUrl}
                      alt={info.trainerName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
              </div>

              <p className="text-sm text-(--color_text_muted) mb-1">Вас приглашает тренер</p>
              <h1 className="text-xl font-bold text-white mb-3">{info?.trainerName}</h1>

              {info?.trainerSpecializations && info.trainerSpecializations.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                  {info.trainerSpecializations.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-0.5 rounded-full bg-(--color_primary_light)/20 text-(--color_primary_light) text-xs font-medium"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {isLoggedIn ? (
                <AccentButton
                  onClick={handleAccept}
                  disabled={accepting}
                  loading={accepting}
                  loadingText="Принимаем..."
                  className="font-semibold rounded-2xl"
                >
                  Принять приглашение
                </AccentButton>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-(--color_text_muted) mb-3">
                    Войдите или зарегистрируйтесь, чтобы принять приглашение
                  </p>
                  <ButtonLink
                    to={`/login?invite=${token}`}
                    className="font-semibold rounded-2xl py-3.5"
                  >
                    Войти
                  </ButtonLink>
                  <ButtonLink
                    to={`/register?invite=${token}`}
                    variant="secondary"
                    className="rounded-2xl py-3 text-center"
                  >
                    Зарегистрироваться
                  </ButtonLink>
                </div>
              )}
            </div>

            <p className="text-center text-xs text-(--color_text_muted)">
              Вас добавят в команду тренера как атлета
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
