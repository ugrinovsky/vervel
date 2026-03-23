import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { athleteApi } from '@/api/athlete';
import { useAuth } from '@/contexts/AuthContext';
import AccentButton from '@/components/ui/AccentButton';

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
      setAccepted(true);
      toast.success('Вы в команде тренера!');
      setTimeout(() => navigate('/my-team'), 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Не удалось принять приглашение';
      toast.error(msg);
    } finally {
      setAccepting(false);
    }
  };

  const initials = info?.trainerName?.[0]?.toUpperCase() || '?';

  if (loadingInfo) {
    return (
      <div className="min-h-screen bg-(--color_bg) flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
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
        <Link
          to="/"
          className="px-6 py-3 rounded-xl bg-(--color_primary_light) text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          На главную
        </Link>
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
            <div className="bg-(--color_bg_card) rounded-3xl p-8 border border-(--color_border) text-center mb-4">
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
                  <Link
                    to={`/login?invite=${token}`}
                    className="block w-full py-3.5 rounded-2xl bg-(--color_primary_light) text-white font-semibold text-sm text-center hover:opacity-90 transition-opacity"
                  >
                    Войти
                  </Link>
                  <Link
                    to={`/register?invite=${token}`}
                    className="block w-full py-3 rounded-2xl bg-(--color_bg_card_hover) text-white text-sm text-center hover:opacity-90 transition-opacity border border-(--color_border)"
                  >
                    Зарегистрироваться
                  </Link>
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
