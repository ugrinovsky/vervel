import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import AthleteQrCode from '@/components/AthleteQrCode/AthleteQrCode';
import AiChat from '@/components/AiChat/AiChat';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import { profileApi, type ProfileData } from '@/api/profile';
import { trainerApi, type TrainerProfileStats } from '@/api/trainer';
import { aiApi } from '@/api/ai';
import type { AiBalance } from '@/api/ai';
import { paymentsApi } from '@/api/payments';
import { useScrollPagination } from '@/hooks/useScrollPagination';
import { THEME_PRESETS, getStoredHue, saveHue } from '@/util/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router';
import { SparklesIcon } from '@heroicons/react/24/outline';

const TOP_UP_AMOUNTS = [100, 250, 500, 1000];

type Tab = 'profile' | 'wallet' | 'settings';

export default function ProfileScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    logout,
    isAthlete,
    isTrainer,
    activeMode,
    switchMode,
    login,
    user,
    token,
    balance,
    setBalance,
  } = useAuth();
  const isBoth = isTrainer && isAthlete;
  const inTrainerMode = isTrainer && (!isAthlete || activeMode === 'trainer');
  const inAthleteMode = isAthlete && (!isTrainer || activeMode === 'athlete');

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const t = searchParams.get('tab') as Tab;
    return t === 'wallet' || t === 'settings' ? t : 'profile';
  });
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Settings form
  const [nameField, setNameField] = useState('');
  const [emailField, setEmailField] = useState('');
  const [genderField, setGenderField] = useState<'male' | 'female' | null>(null);
  const [saving, setSaving] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Theme
  const [activeHue, setActiveHue] = useState(getStoredHue);
  const themeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trainer stats
  const [trainerStats, setTrainerStats] = useState<TrainerProfileStats | null>(null);

  const [becomingAthlete, setBecomingAthlete] = useState(false);

  // Wallet top-up
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [topping, setTopping] = useState(false);

  // Wallet transactions (paginated)
  const txFetcher = useCallback(
    (offset: number, limit: number) =>
      aiApi.getTransactions(offset, limit).then((r) => r.data.data),
    []
  );
  const {
    items: transactions,
    loading: txLoading,
    hasMore: txHasMore,
    initialize: txInit,
    loadMore: txLoadMore,
  } = useScrollPagination<AiBalance['transactions'][number]>(txFetcher, { limit: 20 });

  // AI Chat
  const [aiChatOpen, setAiChatOpen] = useState(false);

  // QR
  const [qrOpen, setQrOpen] = useState(false);

  // Feedback
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'general' | 'bug' | 'feature' | 'other'>('general');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackContact, setFeedbackContact] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);

  // Guard against React 18 StrictMode double-firing
  const topupHandled = useRef(false);

  const handleThemeChange = (hue: number) => {
    setActiveHue(hue);
    saveHue(hue);
    if (themeDebounceRef.current) clearTimeout(themeDebounceRef.current);
    themeDebounceRef.current = setTimeout(() => {
      profileApi.updateProfile({ themeHue: hue }).catch(() => {});
    }, 500);
  };

  useEffect(() => {
    loadProfile();
    if (isTrainer) {
      trainerApi
        .getProfileStats()
        .then((res) => {
          if (res.data.success) setTrainerStats(res.data.data);
        })
        .catch(() => {});
    }
    aiApi
      .getBalance()
      .then((res) => setBalance(res.data.balance))
      .catch(() => {});
    txInit();
  }, [isTrainer, inTrainerMode]);

  // Handle redirect back from YooKassa after successful payment
  useEffect(() => {
    if (searchParams.get('topup') === 'success' && !topupHandled.current) {
      topupHandled.current = true;
      toast.success('Баланс пополнен!');
      aiApi
        .getBalance()
        .then((res) => setBalance(res.data.balance))
        .catch(() => {});
      txInit();
      setSearchParams({ tab: 'wallet' }, { replace: true });
      setActiveTab('wallet');
    }
  }, []);

  useEffect(() => {
    if (data) {
      setNameField(data.user.fullName || '');
      setEmailField(data.user.email);
      setGenderField(data.user.gender ?? null);
    }
  }, [data]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await profileApi.getProfile();
      if (response.data.success) {
        const profileData = response.data.data;
        setData(profileData);
        if (profileData.user.balance !== undefined) {
          setBalance(profileData.user.balance);
        }
        if (profileData.user.themeHue !== null && profileData.user.themeHue !== undefined) {
          setActiveHue(profileData.user.themeHue);
          saveHue(profileData.user.themeHue);
        }
      }
    } catch {
      toast.error('Не удалось загрузить профиль');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const response = await profileApi.updateProfile({
        fullName: nameField,
        email: emailField,
        gender: genderField,
      });
      if (response.data.success) {
        const updatedUser = response.data.data.user;
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...stored, ...updatedUser }));
        if (user && token) login({ ...user, ...updatedUser }, token);
        setData((prev) => (prev ? { ...prev, user: updatedUser } : prev));
        toast.success('Профиль обновлён');
      }
    } catch {
      toast.error('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Минимум 6 символов');
      return;
    }
    try {
      setSavingPassword(true);
      const response = await profileApi.changePassword({
        currentPassword,
        newPassword,
      });
      if (response.data.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        toast.success('Пароль изменён');
      }
    } catch {
      toast.error('Неверный текущий пароль');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleTopup = async () => {
    if (!selectedAmount) return;
    setTopping(true);
    try {
      const res = await paymentsApi.topup(selectedAmount);
      window.location.href = res.data.confirmationUrl;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 503) {
        toast.error('Пополнение пока недоступно — сайт не подключён к платёжной системе.');
      } else {
        toast.error('Ошибка создания платежа. Попробуйте позже.');
      }
    } finally {
      setTopping(false);
    }
  };

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

  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim()) return;
    setSendingFeedback(true);
    try {
      await profileApi.sendFeedback({
        type: feedbackType,
        message: feedbackMessage.trim(),
        contact: feedbackContact.trim() || undefined,
      });
      toast.success('Спасибо за отзыв! Мы обязательно рассмотрим.');
      setFeedbackOpen(false);
      setFeedbackMessage('');
      setFeedbackContact('');
      setFeedbackType('general');
    } catch {
      toast.error('Не удалось отправить отзыв');
    } finally {
      setSendingFeedback(false);
    }
  };

  const getInitials = () => {
    if (data?.user.fullName) {
      return data.user.fullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return data?.user.email?.[0]?.toUpperCase() || '?';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (!data) return <Screen loading={loading} className="profile-screen" />;

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: 'profile', label: 'Профиль', emoji: '👤' },
    { id: 'wallet', label: 'Кошелёк', emoji: '💰' },
    { id: 'settings', label: 'Настройки', emoji: '⚙️' },
  ];

  return (
    <Screen className="profile-screen">
      <AiChat open={aiChatOpen} onClose={() => setAiChatOpen(false)} />

      {/* QR BottomSheet */}
      <BottomSheet open={qrOpen} onClose={() => setQrOpen(false)} emoji="📲" title="QR-код для тренера">
        <p className="text-sm text-(--color_text_muted) mb-5">
          Покажите этот код тренеру, чтобы он мог добавить вас в команду
        </p>
        {data && (
          <div className="flex items-center justify-center">
            <AthleteQrCode
              athleteId={data.user.id}
              name={data.user.fullName}
              email={data.user.email}
            />
          </div>
        )}
      </BottomSheet>

      {/* Feedback BottomSheet */}
      <BottomSheet open={feedbackOpen} onClose={() => setFeedbackOpen(false)} emoji="💬" title="Написать нам">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {([['general', '💬 Общее'], ['bug', '🐛 Баг'], ['feature', '✨ Идея'], ['other', '📝 Другое']] as const).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setFeedbackType(val)}
                className={`py-2 rounded-xl text-xs font-medium transition-all border ${feedbackType === val ? 'bg-(--color_primary_light) text-white border-(--color_primary_light)' : 'bg-(--color_bg_input) text-(--color_text_muted) border-(--color_border) hover:text-white'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <textarea
            value={feedbackMessage}
            onChange={(e) => setFeedbackMessage(e.target.value)}
            placeholder="Напишите ваш отзыв, предложение или сообщение об ошибке…"
            rows={5}
            className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-4 py-3 text-white text-sm resize-none outline-none focus:border-(--color_primary_light) transition-colors placeholder:text-white/30"
          />
          <input
            type="text"
            value={feedbackContact}
            onChange={(e) => setFeedbackContact(e.target.value)}
            placeholder="Email или телефон для ответа (необязательно)"
            className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors placeholder:text-white/30"
          />
          <button
            onClick={handleSendFeedback}
            disabled={!feedbackMessage.trim() || sendingFeedback}
            className="w-full py-3 rounded-xl text-sm font-medium bg-(--color_primary_light) text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {sendingFeedback ? 'Отправляем…' : 'Отправить'}
          </button>
        </div>
      </BottomSheet>

      <div className="p-4 w-full max-w-2xl mx-auto">
        <ScreenHeader icon="👤" title="Профиль" description="Ваш аккаунт, кошелёк для оплаты AI-функций и настройки приложения" />

        {/* Tabs */}
        <div className="flex gap-1 bg-(--color_bg_card) rounded-2xl p-1 border border-(--color_border) mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchParams({ tab: tab.id }, { replace: true });
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-(--color_primary_light) text-white shadow-sm'
                  : 'text-(--color_text_muted) hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── TAB: ПРОФИЛЬ ── */}
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* User Info */}
              <div className="bg-(--color_bg_card) rounded-2xl p-6 border border-(--color_border)">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-linear-to-br from-(--color_primary_light) to-(--color_primary) flex items-center justify-center text-2xl font-bold text-white shrink-0">
                    {getInitials()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xl font-bold text-white truncate">
                      {data.user.fullName || 'Без имени'}
                    </div>
                    <div className="text-sm text-(--color_text_muted) truncate">
                      {data.user.email}
                    </div>
                    <div className="text-xs text-(--color_text_muted) mt-1">
                      Участник с {formatDate(data.user.createdAt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {inTrainerMode ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border) text-center">
                      <div className="text-2xl font-bold text-white">{data.stats.totalWorkouts}</div>
                      <div className="text-xs text-(--color_text_muted) mt-1">Тренировок</div>
                    </div>
                    <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border) text-center">
                      <div className="text-2xl font-bold text-white">{data.stats.streak}</div>
                      <div className="text-xs text-(--color_text_muted) mt-1">Дней подряд</div>
                    </div>
                    <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border) text-center">
                      <div className="text-2xl font-bold text-white">{data.stats.longestStreak}</div>
                      <div className="text-xs text-(--color_text_muted) mt-1">Рекорд дней</div>
                    </div>
                  </>
                )}
              </div>

              {/* Achievements link + QR (athletes) */}
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
                      <div className="text-xs text-(--color_text_muted) mt-0.5">
                        Покажите тренеру, чтобы он добавил вас в команду
                      </div>
                    </div>
                    <div className="text-(--color_text_muted) text-sm">→</div>
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
                    <div className="text-xs text-(--color_text_muted) mt-0.5">
                      Фото, специализации, образование — видно атлетам
                    </div>
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
            </motion.div>
          )}

          {/* ── TAB: КОШЕЛЁК / AI ── */}
          {activeTab === 'wallet' && (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Balance card */}
              <div className="bg-(--color_bg_card) rounded-2xl p-6 border border-(--color_border)">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Кошелёк</h2>
                    <p className="text-xs text-(--color_text_muted) mt-0.5">AI-функции, донаты тренерам</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      {balance !== null ? `${balance}₽` : '—'}
                    </div>
                    <div className="text-xs text-(--color_text_muted)">баланс</div>
                  </div>
                </div>

                {/* AI costs hint */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  {(inTrainerMode
                    ? [
                        { label: 'Генерация', cost: '10₽' },
                        { label: 'Распознавание', cost: '9₽' },
                        { label: 'AI-чат', cost: 'от 0.5₽' },
                      ]
                    : [
                        { label: 'Распознавание', cost: '9₽' },
                        { label: 'AI-чат', cost: 'от 0.5₽' },
                      ]
                  ).map(({ label, cost }) => (
                    <div
                      key={label}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-(--color_text_muted)"
                    >
                      {label} — <span className="text-white/70">{cost}</span>
                    </div>
                  ))}
                </div>

                {/* Top-up */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {TOP_UP_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setSelectedAmount(amount)}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                        selectedAmount === amount
                          ? 'bg-(--color_primary_light) text-white'
                          : 'bg-(--color_bg_card_hover) text-(--color_text_muted) hover:text-white'
                      }`}
                    >
                      {amount}₽
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleTopup}
                  disabled={!selectedAmount || topping}
                  className="w-full py-3 rounded-xl bg-(--color_primary_light) text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {topping ? 'Переход к оплате…' : selectedAmount ? `Пополнить на ${selectedAmount}₽` : 'Выберите сумму'}
                </button>
              </div>

              {/* AI Chat button */}
              <button
                onClick={() => setAiChatOpen(true)}
                className="w-full flex items-center gap-3 p-4 bg-(--color_bg_card) rounded-2xl border border-(--color_border) hover:bg-(--color_bg_card_hover) transition-colors text-left"
              >
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500/20 shrink-0">
                  <SparklesIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">AI-помощник</div>
                  <p className="text-xs text-(--color_text_muted) mt-0.5">
                    Тренировки, питание, восстановление — от 0.5₽/сообщение
                  </p>
                </div>
                <span className="text-(--color_text_muted) text-sm">→</span>
              </button>

              {/* Transaction history */}
              {(transactions.length > 0 || txLoading) && (
                <div className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border)">
                  <p className="text-sm font-semibold text-white mb-3">История операций</p>
                  {txLoading && transactions.length === 0 ? (
                    <div className="flex justify-center py-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-(--color_primary_light) rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {transactions.map((tx) => {
                        const isIncome = tx.amount > 0;
                        const typeMap: Record<string, string> = {
                          topup: '💳',
                          chat: '🤖',
                          generate: '✨',
                          recognize: '📷',
                        };
                        const emoji = typeMap[tx.type] ?? '💰';
                        return (
                          <div key={tx.id} className="flex items-center gap-2">
                            <span className="text-base shrink-0">{emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-white truncate">{tx.description}</div>
                              <div className="text-xs text-(--color_text_muted)">
                                {new Date(tx.createdAt).toLocaleDateString('ru-RU', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </div>
                            </div>
                            <div className={`text-sm font-semibold shrink-0 ${isIncome ? 'text-emerald-400' : 'text-(--color_text_muted)'}`}>
                              {isIncome ? '+' : ''}{tx.amount}₽
                            </div>
                          </div>
                        );
                      })}
                      {txHasMore && (
                        <button
                          onClick={() => txLoadMore()}
                          disabled={txLoading}
                          className="w-full text-xs text-(--color_text_muted) hover:text-white py-1 transition-colors disabled:opacity-50"
                        >
                          {txLoading ? 'Загрузка…' : 'Загрузить ещё'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ── TAB: НАСТРОЙКИ ── */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Theme picker */}
              <div className="bg-(--color_bg_card) rounded-2xl p-6 border border-(--color_border)">
                <h2 className="text-base font-semibold text-white mb-4">Цвет темы</h2>
                <div className="flex flex-wrap gap-3">
                  {THEME_PRESETS.map((preset) => (
                    <button
                      key={preset.hue}
                      onClick={() => handleThemeChange(preset.hue)}
                      title={preset.label}
                      className="relative w-10 h-10 rounded-full border-2 transition-all"
                      style={{
                        background: `hsl(${preset.hue}, 74%, 30%)`,
                        borderColor: activeHue === preset.hue ? 'white' : 'rgba(255,255,255,0.15)',
                        transform: activeHue === preset.hue ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <label className="text-xs text-(--color_text_muted)">Свой цвет</label>
                  <input
                    type="range"
                    min={0}
                    max={359}
                    value={activeHue}
                    onChange={(e) => handleThemeChange(Number(e.target.value))}
                    className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${Array.from({ length: 12 }, (_, i) => `hsl(${i * 30}, 74%, 30%)`).join(', ')})`,
                    }}
                  />
                  <div
                    className="w-8 h-8 rounded-lg border border-(--color_border)"
                    style={{ background: `hsl(${activeHue}, 74%, 30%)` }}
                  />
                </div>
              </div>

              {/* Profile settings */}
              <div className="bg-(--color_bg_card) rounded-2xl p-6 border border-(--color_border)">
                <h2 className="text-base font-semibold text-white mb-4">Личные данные</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-(--color_text_muted) mb-1 block">Имя</label>
                    <input
                      type="text"
                      value={nameField}
                      onChange={(e) => setNameField(e.target.value)}
                      className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors"
                      placeholder="Ваше имя"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-(--color_text_muted) mb-1 block">Email</label>
                    <input
                      type="email"
                      value={emailField}
                      onChange={(e) => setEmailField(e.target.value)}
                      className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-(--color_text_muted) mb-2 block">Пол</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          ['male', '♂', 'Мужской'],
                          ['female', '♀', 'Женский'],
                        ] as const
                      ).map(([val, icon, label]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setGenderField(genderField === val ? null : val)}
                          className="py-2.5 rounded-xl border text-sm font-medium transition-all"
                          style={{
                            borderColor: genderField === val ? 'var(--color_primary_light)' : 'var(--color_border)',
                            background: genderField === val ? 'rgb(var(--color_primary_light_ch) / 0.15)' : 'var(--color_bg_input)',
                            color: genderField === val ? 'white' : 'var(--color_text_muted)',
                          }}
                        >
                          {icon} {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full py-3 rounded-xl text-sm font-medium bg-(--color_primary_light) text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>

                {/* Password change */}
                <div className="mt-6 pt-6 border-t border-(--color_border)">
                  <h3 className="text-sm font-semibold text-white mb-3">Сменить пароль</h3>
                  <div className="space-y-3">
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors"
                      placeholder="Текущий пароль"
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors"
                      placeholder="Новый пароль"
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors"
                      placeholder="Подтвердите пароль"
                    />
                    <button
                      onClick={handleChangePassword}
                      disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                      className="w-full py-3 rounded-xl text-sm font-medium bg-(--color_bg_card_hover) text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {savingPassword ? 'Сохранение...' : 'Сменить пароль'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Feedback */}
              <button
                onClick={() => setFeedbackOpen(true)}
                className="w-full py-3 rounded-xl text-sm font-medium bg-(--color_bg_card) text-(--color_text_muted) border border-(--color_border) hover:bg-(--color_bg_card_hover) hover:text-white transition-colors"
              >
                💬 Написать нам
              </button>

              {/* Legal links */}
              <div className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border)">
                <p className="text-xs font-semibold text-(--color_text_muted) uppercase tracking-wider mb-3">Документы</p>
                <div className="space-y-2">
                  {[
                    { path: '/docs/privacy', label: 'Политика конфиденциальности' },
                    { path: '/docs/offer', label: 'Публичная оферта' },
                    { path: '/docs/seller', label: 'Реквизиты продавца' },
                  ].map(({ path, label }) => (
                    <button
                      key={path}
                      onClick={() => navigate(path)}
                      className="w-full flex items-center justify-between text-sm text-(--color_text_muted) hover:text-white transition-colors"
                    >
                      <span>{label}</span>
                      <span className="text-xs">→</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-(--color_text_muted) mt-3 leading-relaxed">
                  Vervel · ИП/Самозанятый · По вопросам: support@vervel.app
                </p>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full py-3 rounded-xl text-sm font-medium bg-(--color_bg_card) text-(--color_text_muted) border border-(--color_border) hover:bg-(--color_bg_card_hover) hover:text-white transition-colors"
              >
                Выйти из аккаунта
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Screen>
  );
}
