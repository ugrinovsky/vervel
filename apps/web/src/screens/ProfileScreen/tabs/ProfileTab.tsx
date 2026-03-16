import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { profileApi, type ProfileData } from '@/api/profile';
import { privateApi } from '@/api/http/privateApi';
import { useAuth } from '@/contexts/AuthContext';
import AthleteQrCode from '@/components/AthleteQrCode/AthleteQrCode';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import type { TrainerProfileStats } from '@/api/trainer';

interface Props {
  data: ProfileData;
  trainerStats: TrainerProfileStats | null;
}

export default function ProfileTab({ data, trainerStats }: Props) {
  const navigate = useNavigate();
  const { isAthlete, isTrainer, activeMode, switchMode, login, user, token } = useAuth();
  const isBoth = isTrainer && isAthlete;
  const inTrainerMode = isTrainer && (!isAthlete || activeMode === 'trainer');
  const inAthleteMode = isAthlete && (!isTrainer || activeMode === 'athlete');

  const [becomingAthlete, setBecomingAthlete] = useState(false);
  const [becomingTrainer, setBecomingTrainer] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [referralStats, setReferralStats] = useState<{ count: number; totalEarned: number; bonusPerReferral: number } | null>(null);

  useEffect(() => {
    if (!inAthleteMode) return;
    privateApi
      .get<{ success: boolean; data: { count: number; totalEarned: number; bonusPerReferral: number } }>('/referral/stats')
      .then((res) => setReferralStats(res.data.data))
      .catch(() => {});
  }, [inAthleteMode]);

  const getInitials = () => {
    if (data.user.fullName) {
      return data.user.fullName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
    }
    return data.user.email?.[0]?.toUpperCase() || '?';
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  const handleBecomeAthlete = async () => {
    try {
      setBecomingAthlete(true);
      const res = await profileApi.becomeAthlete();
      if (res.data.success && user && token) {
        const updatedUser = res.data.data.user;
        login({ ...user, role: updatedUser.role as any }, token);
        toast.success('Режим атлета активирован!');
      }
    } catch {
      toast.error('Ошибка при активации режима атлета');
    } finally {
      setBecomingAthlete(false);
    }
  };

  const handleBecomeTrainer = async () => {
    try {
      setBecomingTrainer(true);
      const res = await profileApi.becomeTrainer();
      if (res.data.success && user && token) {
        const updatedUser = res.data.data.user;
        login({ ...user, role: updatedUser.role as any }, token);
        toast.success('Режим тренера активирован!');
      }
    } catch {
      toast.error('Ошибка при активации режима тренера');
    } finally {
      setBecomingTrainer(false);
    }
  };

  return (
    <motion.div
      key="profile"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.15 }}
      className="space-y-4"
    >
      <BottomSheet open={qrOpen} onClose={() => setQrOpen(false)} emoji="📲" title="QR-код для тренера">
        <p className="text-sm text-(--color_text_muted) mb-5">
          Покажите этот код тренеру, чтобы он мог добавить вас в команду
        </p>
        <div className="flex items-center justify-center">
          <AthleteQrCode athleteId={data.user.id} name={data.user.fullName} email={data.user.email} />
        </div>
      </BottomSheet>

      {/* User Info */}
      <div className="bg-(--color_bg_card) rounded-2xl p-6 border border-(--color_border)">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-linear-to-br from-(--color_primary_light) to-(--color_primary) flex items-center justify-center text-2xl font-bold text-white shrink-0">
            {getInitials()}
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-white truncate">{data.user.fullName || 'Без имени'}</div>
            <div className="text-sm text-(--color_text_muted) truncate">{data.user.email}</div>
            <div className="text-xs text-(--color_text_muted) mt-1">Участник с {formatDate(data.user.createdAt)}</div>
          </div>
        </div>
      </div>

      {/* Stats — trainer only */}
      {inTrainerMode && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border) text-center">
            <div className="text-2xl font-bold text-white">{trainerStats?.athleteCount ?? '—'}</div>
            <div className="text-xs text-(--color_text_muted) mt-1">Атлетов</div>
          </div>
          <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border) text-center">
            <div className="text-2xl font-bold text-white">{trainerStats?.groupCount ?? '—'}</div>
            <div className="text-xs text-(--color_text_muted) mt-1">Групп</div>
          </div>
          <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border) text-center">
            <div className="text-2xl font-bold text-white">{trainerStats?.totalScheduledWorkouts ?? '—'}</div>
            <div className="text-xs text-(--color_text_muted) mt-1">Тренировок</div>
          </div>
        </div>
      )}

      {/* Achievements + QR (athletes) */}
      {inAthleteMode && (
        <>
          <div
            className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border) cursor-pointer hover:bg-(--color_bg_card_hover) transition-colors flex items-center justify-between"
            onClick={() => navigate('/streak')}
          >
            <div>
              <h2 className="text-base font-semibold text-white mb-0.5">Ачивки и Streak</h2>
              <p className="text-sm text-(--color_text_muted)">Посмотреть достижения</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              <span className="text-(--color_text_muted) text-sm">→</span>
            </div>
          </div>
          <button
            onClick={() => setQrOpen(true)}
            className="w-full flex items-center gap-4 p-5 bg-(--color_bg_card) rounded-2xl border border-(--color_border) hover:bg-(--color_bg_card_hover) transition-colors text-left"
          >
            <div className="text-3xl">📲</div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">QR-код для тренера</div>
              <div className="text-xs text-(--color_text_muted) mt-0.5">Покажите тренеру, чтобы он добавил вас в команду</div>
            </div>
            <div className="text-(--color_text_muted) text-sm">→</div>
          </button>

          {/* Referral link */}
          <button
            onClick={() => {
              const url = `${window.location.origin}/register?ref=${data.user.id}`;
              navigator.clipboard.writeText(url);
              toast.success('Реферальная ссылка скопирована!');
            }}
            className="w-full flex items-center gap-4 p-5 bg-(--color_bg_card) rounded-2xl border border-(--color_border) hover:bg-(--color_bg_card_hover) transition-colors text-left"
          >
            <div className="text-3xl">🎁</div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">Пригласить друга</div>
              <div className="text-xs text-(--color_text_muted) mt-0.5">
                +{referralStats?.bonusPerReferral ?? 50}₽ на баланс за каждого
                {referralStats && referralStats.count > 0 && (
                  <span className="ml-2 text-(--color_primary_light)">
                    · {referralStats.count} {referralStats.count === 1 ? 'приведён' : 'приведено'} · +{referralStats.totalEarned}₽
                  </span>
                )}
              </div>
            </div>
            <div className="text-(--color_text_muted) text-sm">📋</div>
          </button>
        </>
      )}

      {/* Professional profile (trainers) */}
      {inTrainerMode && (
        <button
          onClick={() => navigate('/trainer/personal')}
          className="w-full flex items-center gap-4 p-5 bg-(--color_bg_card) rounded-2xl border border-(--color_border) hover:bg-(--color_bg_card_hover) transition-colors text-left"
        >
          <div className="text-3xl">🪪</div>
          <div className="flex-1">
            <div className="text-sm font-medium text-white">Профессиональный профиль</div>
            <div className="text-xs text-(--color_text_muted) mt-0.5">Фото, специализации, образование — видно атлетам</div>
          </div>
          <div className="text-(--color_text_muted) text-sm">→</div>
        </button>
      )}

      {/* Cabinet switcher */}
      {isBoth && (
        <button
          onClick={() => {
            switchMode();
            navigate(activeMode === 'trainer' ? '/' : '/trainer');
          }}
          className="w-full flex items-center gap-4 p-5 bg-(--color_bg_card) rounded-2xl border border-(--color_border) hover:bg-(--color_bg_card_hover) transition-colors text-left"
        >
          <div className="text-3xl">{activeMode === 'trainer' ? '🏃' : '🏋️'}</div>
          <div className="flex-1">
            <div className="text-sm font-medium text-white">
              {activeMode === 'trainer' ? 'Перейти в кабинет атлета' : 'Перейти в кабинет тренера'}
            </div>
            <div className="text-xs text-(--color_text_muted) mt-0.5">
              {activeMode === 'trainer' ? 'Тренировки, аватар, статистика' : 'Группы, атлеты, расписание'}
            </div>
          </div>
          <div className="text-(--color_text_muted) text-sm">→</div>
        </button>
      )}

      {/* Become athlete */}
      {isTrainer && !isAthlete && (
        <div className="bg-(--color_bg_card) rounded-2xl p-6 border border-(--color_border)">
          <div className="flex items-start gap-4">
            <div className="text-3xl">🏃</div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-white mb-1">Стать атлетом</h2>
              <p className="text-sm text-(--color_text_muted) mb-4">
                Активируйте режим атлета, чтобы вести собственные тренировки и статистику.
              </p>
              <button
                onClick={handleBecomeAthlete}
                disabled={becomingAthlete}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-(--color_primary_light) text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {becomingAthlete ? 'Активация...' : 'Стать атлетом'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Become trainer */}
      {isAthlete && !isTrainer && (
        <div className="bg-(--color_bg_card) rounded-2xl p-6 border border-(--color_border)">
          <div className="flex items-start gap-4">
            <div className="text-3xl">🏋️</div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-white mb-1">Стать тренером</h2>
              <p className="text-sm text-(--color_text_muted) mb-4">
                Активируйте режим тренера, чтобы вести группы, атлетов и расписание тренировок.
              </p>
              <button
                onClick={handleBecomeTrainer}
                disabled={becomingTrainer}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-(--color_primary_light) text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {becomingTrainer ? 'Активация...' : 'Стать тренером'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
