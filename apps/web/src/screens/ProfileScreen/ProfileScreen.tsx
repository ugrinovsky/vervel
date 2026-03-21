import { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import { profileApi, type ProfileData } from '@/api/profile';
import { trainerApi, type TrainerProfileStats } from '@/api/trainer';
import { aiApi } from '@/api/ai';

import { useAuth } from '@/contexts/AuthContext';
import ProfileTab from './tabs/ProfileTab';
import ScreenHint from '@/components/ScreenHint/ScreenHint';
import WalletTab from './tabs/WalletTab';
import SettingsTab from './tabs/SettingsTab';

type Tab = 'profile' | 'wallet' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'profile', label: 'Профиль' },
  { id: 'wallet', label: 'Кошелек' },
  { id: 'settings', label: 'Настройки' },
];

export default function ProfileScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isTrainer, isAthlete, activeMode, balance, setBalance } = useAuth();
  const inTrainerMode = isTrainer && (!isAthlete || activeMode === 'trainer');

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const t = searchParams.get('tab') as Tab;
    return t === 'wallet' || t === 'settings' ? t : 'profile';
  });
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [trainerStats, setTrainerStats] = useState<TrainerProfileStats | null>(null);
  const topupHandled = useRef(false);

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
      setSearchParams({ tab: 'wallet' }, { replace: true });
      setActiveTab('wallet');
    }
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await profileApi.getProfile();
      if (response.data.success) {
        const profileData = response.data.data;
        setData(profileData);
        if (profileData.user.balance !== undefined) setBalance(profileData.user.balance);
      }
    } catch {
      toast.error('Не удалось загрузить профиль');
    } finally {
      setLoading(false);
    }
  };

  if (!data) return <Screen loading={loading} className="profile-screen" />;

  return (
    <Screen className="profile-screen">
      <div className="p-4 w-full mx-auto">
        <ScreenHeader
          icon="👤"
          title="Профиль"
          description="Ваш аккаунт, кошелек для оплаты AI-функций и настройки приложения"
        />

        <ScreenHint className="mb-4">
          <span className="text-white font-medium">Профиль</span> — данные и фото аккаунта.{' '}
          <span className="text-white font-medium">Кошелек</span> — баланс для AI-функций,
          история списаний и пополнение.{' '}
          <span className="text-white font-medium">Настройки</span> — тема, уведомления и выход.
        </ScreenHint>

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
          {activeTab === 'profile' && (
            <ProfileTab key="profile" data={data} trainerStats={trainerStats} />
          )}
          {activeTab === 'wallet' && (
            <WalletTab
              key="wallet"
              balance={balance}
              setBalance={setBalance}
              inTrainerMode={inTrainerMode}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsTab
              key="settings"
              data={data}
              onProfileUpdate={(updatedUser) =>
                setData((prev) => (prev ? { ...prev, user: updatedUser } : prev))
              }
            />
          )}
        </AnimatePresence>
      </div>
    </Screen>
  );
}
