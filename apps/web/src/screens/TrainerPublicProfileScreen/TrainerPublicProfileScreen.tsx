import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import FullScreenChat from '@/components/FullScreenChat/FullScreenChat';
import { profileApi, type TrainerPublicProfile } from '@/api/profile';
import { athleteApi } from '@/api/athlete';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import BackButton from '@/components/BackButton/BackButton';

const DONATION_AMOUNTS = [100, 300, 500, 1000];

export default function TrainerPublicProfileScreen() {
  const { trainerId } = useParams<{ trainerId: string }>();
  const navigate = useNavigate();
  const id = Number(trainerId);

  const [profile, setProfile] = useState<TrainerPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatId, setChatId] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    profileApi
      .getTrainerPublicProfile(id)
      .then((res) => {
        if (res.data.success) setProfile(res.data.data);
      })
      .catch(() => toast.error('Не удалось загрузить профиль'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleOpenChat = async () => {
    if (chatId) {
      setChatOpen(true);
      return;
    }
    setOpeningChat(true);
    try {
      const res = await athleteApi.getTrainerChat(id);
      setChatId(res.data.data.chatId);
      setChatOpen(true);
    } catch {
      toast.error('Ошибка открытия чата');
    } finally {
      setOpeningChat(false);
    }
  };

  const initials = profile?.fullName
    ? profile.fullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : profile?.email?.[0]?.toUpperCase() || '?';

  if (loading) {
    return (
      <Screen>
        <div className="p-4 flex items-center justify-center min-h-[60vh]">
          <div className="text-(--color_text_muted)">Загрузка...</div>
        </div>
      </Screen>
    );
  }

  if (!profile) return null;

  return (
    <Screen>
      <FullScreenChat
        open={chatOpen}
        chatId={chatId}
        title={`Тренер: ${profile.fullName || profile.email}`}
        onClose={() => setChatOpen(false)}
      />

      <div className="p-4 w-full max-w-2xl mx-auto">
        <BackButton onClick={() => navigate(-1)} />

        {/* Header: photo + name + specializations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-6"
        >
          <div className="w-28 h-28 rounded-full overflow-hidden bg-gradient-to-br from-(--color_primary_light) to-(--color_primary) flex items-center justify-center mb-3 shadow-lg">
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={profile.fullName || 'trainer'}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-4xl font-bold text-white">{initials}</span>
            )}
          </div>
          <h1 className="text-xl font-bold text-white mb-1">
            {profile.fullName || 'Тренер'}
          </h1>
          {profile.specializations && profile.specializations.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-2">
              {profile.specializations.map((s) => (
                <span
                  key={s}
                  className="px-2.5 py-0.5 rounded-full bg-(--color_primary_light)/20 text-(--color_primary_light) text-xs font-medium"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </motion.div>

        {/* Write button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={handleOpenChat}
          disabled={openingChat}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-(--color_primary_light) text-white font-medium text-sm hover:opacity-90 transition-opacity mb-6 disabled:opacity-50"
        >
          <ChatBubbleLeftIcon className="w-4 h-4" />
          {openingChat ? 'Открытие...' : 'Написать тренеру'}
        </motion.button>

        {/* About */}
        {profile.bio && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border) mb-4"
          >
            <h2 className="text-sm font-semibold text-white mb-2">О тренере</h2>
            <p className="text-sm text-(--color_text_muted) leading-relaxed whitespace-pre-wrap">
              {profile.bio}
            </p>
          </motion.div>
        )}

        {/* Education */}
        {profile.education && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border) mb-4"
          >
            <h2 className="text-sm font-semibold text-white mb-2">Образование</h2>
            <p className="text-sm text-(--color_text_muted)">{profile.education}</p>
          </motion.div>
        )}

        {/* Donations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border)"
        >
          <h2 className="text-sm font-semibold text-white mb-1">Поддержать тренера</h2>
          <p className="text-xs text-(--color_text_muted) mb-4">
            Оплата тренерских услуг скоро появится
          </p>

          {/* Fixed amounts */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {DONATION_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => {
                  setSelectedAmount(amount);
                  setCustomAmount('');
                }}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  selectedAmount === amount && !customAmount
                    ? 'bg-(--color_primary_light) text-white'
                    : 'bg-(--color_bg_card_hover) text-(--color_text_secondary) hover:text-white'
                }`}
              >
                {amount}₽
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <input
            type="number"
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              setSelectedAmount(null);
            }}
            placeholder="Другая сумма, ₽"
            className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors placeholder:text-(--color_text_muted) mb-3"
          />

          {/* Donate button — disabled, tooltip "Скоро" */}
          <div className="relative group">
            <button
              disabled
              className="w-full py-3 rounded-xl bg-(--color_primary_light)/40 text-white/40 text-sm font-medium cursor-not-allowed"
            >
              Поддержать
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-black/80 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Скоро
            </div>
          </div>
        </motion.div>
      </div>
    </Screen>
  );
}
