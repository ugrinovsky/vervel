import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { profileApi, type ProfileData } from '@/api/profile';
import { privateApi } from '@/api/http/privateApi';
import { useAuth } from '@/contexts/AuthContext';
import AthleteQrCode from '@/components/AthleteQrCode/AthleteQrCode';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import type { TrainerProfileStats } from '@/api/trainer';
import AvatarCropModal from '@/components/AvatarCropModal/AvatarCropModal';
import UserAvatar from '@/components/UserAvatar/UserAvatar';
import { CameraIcon } from '@heroicons/react/24/outline';
import AccentButton from '@/components/ui/AccentButton';

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
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(data.user.photoUrl ?? null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropConfirm = async (blob: Blob) => {
    setCropSrc(null);
    setUploadingPhoto(true);
    try {
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      const res = await profileApi.uploadPhoto(file);
      setPhotoUrl(res.data.data.photoUrl);
      toast.success('Фото обновлено');
    } catch {
      toast.error('Ошибка загрузки фото');
    } finally {
      setUploadingPhoto(false);
    }
  };

  useEffect(() => {
    if (!inAthleteMode) return;
    privateApi
      .get<{ success: boolean; data: { count: number; totalEarned: number; bonusPerReferral: number } }>('/referral/stats')
      .then((res) => setReferralStats(res.data.data))
      .catch(() => {});
  }, [inAthleteMode]);


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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
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

      {cropSrc && (
        <AvatarCropModal
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onClose={() => setCropSrc(null)}
        />
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* User Info */}
      <div className="bg-(--color_bg_card) rounded-2xl border border-(--color_border) overflow-hidden">
        <div className="flex items-center gap-4 p-6">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingPhoto}
            className="relative shrink-0"
          >
            <UserAvatar photoUrl={photoUrl} size={96} />
            {!photoUrl && !uploadingPhoto && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center gap-0.5">
                <CameraIcon className="w-6 h-6 text-white" />
                <span className="text-[9px] text-white/80 font-medium leading-none">Фото</span>
              </div>
            )}
            {photoUrl && !uploadingPhoto && (
              <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-(--color_primary_light) flex items-center justify-center border-2 border-(--color_bg_card)">
                <CameraIcon className="w-3 h-3 text-white" />
              </div>
            )}
            {uploadingPhoto && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </button>
          <div className="min-w-0">
            <div className="text-xl font-bold text-white truncate">{data.user.fullName || 'Без имени'}</div>
            <div className="text-sm text-(--color_text_muted) truncate">{data.user.email}</div>
            <div className="text-xs text-(--color_text_muted) mt-1">Участник с {formatDate(data.user.createdAt)}</div>
          </div>
        </div>
        {inTrainerMode && (
          <button
            onClick={() => navigate('/trainer/personal')}
            className="w-full flex items-center gap-3 px-6 py-4 border-t border-(--color_border) hover:bg-(--color_bg_card_hover) transition-colors text-left"
          >
            <span className="text-xl">🪪</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white">Профессиональный профиль</div>
              <div className="text-xs text-(--color_text_muted) mt-0.5">Фото, специализации, образование — видно атлетам</div>
            </div>
            <span className="text-(--color_text_muted) text-sm shrink-0">→</span>
          </button>
        )}
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
              <AccentButton
                size="sm"
                onClick={handleBecomeAthlete}
                disabled={becomingAthlete}
                loading={becomingAthlete}
                loadingText="Активация..."
                className="px-5 py-2.5 rounded-xl"
              >
                Стать атлетом
              </AccentButton>
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
              <AccentButton
                size="sm"
                onClick={handleBecomeTrainer}
                disabled={becomingTrainer}
                loading={becomingTrainer}
                loadingText="Активация..."
                className="px-5 py-2.5 rounded-xl"
              >
                Стать тренером
              </AccentButton>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
