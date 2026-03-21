import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import FullScreenChat from '@/components/FullScreenChat/FullScreenChat';
import { profileApi, type TrainerPublicProfile } from '@/api/profile';
import { athleteApi } from '@/api/athlete';
import { ChatBubbleLeftIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import UserAvatar from '@/components/UserAvatar/UserAvatar';
import BackButton from '@/components/BackButton/BackButton';
import AccentButton from '@/components/ui/AccentButton';
import AppInput from '@/components/ui/AppInput';

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
  const [copiedField, setCopiedField] = useState<'phone' | 'card' | null>(null);

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

  const copyToClipboard = (text: string, field: 'phone' | 'card') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const donationAmount = customAmount ? Number(customAmount) : selectedAmount;
  const hasDonateDetails =
    profile?.donatePhone || profile?.donateCard || profile?.donateYookassaLink;

  const initials = profile?.fullName
    ? profile.fullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : profile?.email?.[0]?.toUpperCase() || '?';

  if (!profile) return <Screen loading={loading} className="trainer-public-profile-screen" />;

  return (
    <Screen className="trainer-public-profile-screen">
      <FullScreenChat
        open={chatOpen}
        chatId={chatId}
        title={`Тренер: ${profile.fullName || profile.email}`}
        onClose={() => setChatOpen(false)}
      />

      <div className="p-4 w-full mx-auto">
        <BackButton onClick={() => navigate(-1)} />

        {/* Header: photo + name + specializations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-6"
        >
          <UserAvatar photoUrl={profile.photoUrl} name={profile.fullName} size={112} className="mb-3 shadow-lg" />
          <h1 className="text-xl font-bold text-white mb-1">{profile.fullName || 'Тренер'}</h1>
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <AccentButton
            onClick={handleOpenChat}
            disabled={openingChat}
            loading={openingChat}
            loadingText="Открытие..."
            className="font-medium rounded-2xl"
          >
            <ChatBubbleLeftIcon className="w-4 h-4" />
            Написать тренеру
          </AccentButton>
        </motion.div>

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

          {!hasDonateDetails ? (
            <p className="text-xs text-(--color_text_muted) mt-2">
              Тренер пока не указал реквизиты для поддержки
            </p>
          ) : (
            <>
              {/* Amount selector */}
              <p className="text-xs text-(--color_text_muted) mb-3">
                Выберите сумму или введите свою
              </p>
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
              <AppInput
                type="number"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
                placeholder="Другая сумма, ₽"
                className="mb-4"
              />

              <div className="space-y-2">
                {/* SBP */}
                {profile.donatePhone && (
                  <button
                    onClick={() => copyToClipboard(profile.donatePhone!, 'phone')}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-(--color_bg_card_hover) border border-(--color_border) hover:border-(--color_primary_light)/40 transition-colors group"
                  >
                    <div className="text-left">
                      <p className="text-xs text-(--color_text_muted)">Перевод по СБП</p>
                      <p className="text-sm text-white font-medium">{profile.donatePhone}</p>
                    </div>
                    {copiedField === 'phone' ? (
                      <CheckIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <ClipboardDocumentIcon className="w-4 h-4 text-(--color_text_muted) group-hover:text-white shrink-0 transition-colors" />
                    )}
                  </button>
                )}

                {/* Card */}
                {profile.donateCard && (
                  <button
                    onClick={() => copyToClipboard(profile.donateCard!, 'card')}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-(--color_bg_card_hover) border border-(--color_border) hover:border-(--color_primary_light)/40 transition-colors group"
                  >
                    <div className="text-left">
                      <p className="text-xs text-(--color_text_muted)">Номер карты</p>
                      <p className="text-sm text-white font-medium">{profile.donateCard}</p>
                    </div>
                    {copiedField === 'card' ? (
                      <CheckIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <ClipboardDocumentIcon className="w-4 h-4 text-(--color_text_muted) group-hover:text-white shrink-0 transition-colors" />
                    )}
                  </button>
                )}

                {/* YooKassa link */}
                {profile.donateYookassaLink && (
                  <a
                    href={
                      donationAmount
                        ? `${profile.donateYookassaLink}?sum=${donationAmount}`
                        : profile.donateYookassaLink
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-(--color_primary_light) text-white text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Оплатить картой через ЮКасса
                    {donationAmount ? ` · ${donationAmount}₽` : ''}
                  </a>
                )}
              </div>

              <p className="text-xs text-(--color_text_muted) mt-3 text-center">
                ЮКасса берёт ~3% комиссии · мы не берём ничего
              </p>
            </>
          )}
        </motion.div>
      </div>
    </Screen>
  );
}
