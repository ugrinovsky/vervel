import React, { useState, useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { profileApi, type ProfileData } from '@/api/profile';
import type { UserRole } from '@/api/auth';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeController, THEME_PRESETS, DEFAULT_HUE, type SpecialTheme } from '@/util/ThemeController';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import AccentButton from '@/components/ui/AccentButton';
import AppInput from '@/components/ui/AppInput';

const PWA_STEPS: Record<'ios' | 'android' | 'desktop', { hint: string; steps: React.ReactNode[] }> = {
  ios: {
    hint: 'На iPhone уведомления работают только когда приложение добавлено на главный экран.',
    steps: [
      <>Нажмите <span className="text-white">Поделиться</span> внизу Safari</>,
      <>Выберите <span className="text-white">«На экран «Домой»»</span></>,
      <>Откройте приложение с главного экрана</>,
      <>Включите уведомления в настройках профиля</>,
    ],
  },
  android: {
    hint: 'Установите приложение для получения уведомлений.',
    steps: [
      <>Нажмите <span className="text-white">⋮</span> в правом верхнем углу Chrome</>,
      <>Выберите <span className="text-white">«Добавить на главный экран»</span></>,
      <>Откройте приложение с главного экрана</>,
      <>Включите уведомления в настройках профиля</>,
    ],
  },
  desktop: {
    hint: 'Установите приложение для получения уведомлений.',
    steps: [
      <>Нажмите значок <span className="text-white">установки</span> в адресной строке браузера</>,
      <>Или откройте меню браузера → <span className="text-white">«Установить приложение»</span></>,
      <>Откройте установленное приложение</>,
      <>Включите уведомления в настройках профиля</>,
    ],
  },
}

function PwaInstructions({ platform }: { platform: 'ios' | 'android' | 'desktop' }) {
  const { hint, steps } = PWA_STEPS[platform]
  return (
    <div className="space-y-3 mt-1">
      <p className="text-xs text-(--color_text_muted)">{hint}</p>
      <ol className="space-y-1.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-(--color_text_muted)">
            <span className="shrink-0 w-4 h-4 rounded-full bg-(--color_bg_card_hover) text-white flex items-center justify-center text-[10px] mt-0.5">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

interface Props {
  data: ProfileData;
  onProfileUpdate: (updatedUser: ProfileData['user']) => void;
}

export default function SettingsTab({ data, onProfileUpdate }: Props) {
  const navigate = useNavigate();
  const { logout, login, user, token } = useAuth();
  const { permission: pushPermission, loading: pushLoading, enable: enablePush, supported: pushSupported } = usePushNotifications();
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isAndroid = /android/i.test(navigator.userAgent)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (('standalone' in navigator) && (navigator as Navigator & { standalone: boolean }).standalone)

  const [nameField, setNameField] = useState(data.user.fullName || '');
  const [emailField, setEmailField] = useState(data.user.email);
  const [genderField, setGenderField] = useState<'male' | 'female' | null>(data.user.gender ?? null);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [activeHue, setActiveHue] = useState(() => data.user.themeHue ?? DEFAULT_HUE);
  const [activeSpecial, setActiveSpecial] = useState<SpecialTheme | null>(() => ThemeController.getStoredSpecial());

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'general' | 'bug' | 'feature' | 'other'>('general');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackContact, setFeedbackContact] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);

  useEffect(() => {
    setNameField(data.user.fullName || '');
    setEmailField(data.user.email);
    setGenderField(data.user.gender ?? null);
  }, [data.user]);

  const handleThemeChange = (hue: number) => {
    setActiveSpecial(null);
    setActiveHue(hue);
    ThemeController.change(hue);
  };

  const handleSpecialThemeChange = (type: SpecialTheme) => {
    setActiveSpecial(type);
    ThemeController.changeSpecial(type);
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const response = await profileApi.updateProfile({ fullName: nameField, email: emailField, gender: genderField });
      if (response.data.success) {
        const updatedUser = response.data.data.user;
        if (user && token) login({ ...user, ...updatedUser, fullName: updatedUser.fullName ?? '', role: updatedUser.role as UserRole, themeHue: activeHue }, token);
        onProfileUpdate(updatedUser);
        toast.success('Профиль обновлён');
      }
    } catch {
      toast.error('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { toast.error('Пароли не совпадают'); return; }
    if (newPassword.length < 6) { toast.error('Минимум 6 символов'); return; }
    try {
      setSavingPassword(true);
      const response = await profileApi.changePassword({ currentPassword, newPassword });
      if (response.data.success) {
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
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

  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim()) return;
    setSendingFeedback(true);
    try {
      await profileApi.sendFeedback({ type: feedbackType, message: feedbackMessage.trim(), contact: feedbackContact.trim() || undefined });
      toast.success('Спасибо за отзыв! Мы обязательно рассмотрим.');
      setFeedbackOpen(false);
      setFeedbackMessage(''); setFeedbackContact(''); setFeedbackType('general');
    } catch {
      toast.error('Не удалось отправить отзыв');
    } finally {
      setSendingFeedback(false);
    }
  };

  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.15 }}
      className="space-y-4"
    >
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
          <AppInput
            type="text"
            value={feedbackContact}
            onChange={(e) => setFeedbackContact(e.target.value)}
            placeholder="Email или телефон для ответа (необязательно)"
          />
          <AccentButton
            onClick={handleSendFeedback}
            disabled={!feedbackMessage.trim() || sendingFeedback}
            loading={sendingFeedback}
            loadingText="Отправляем…"
          >
            Отправить
          </AccentButton>
        </div>
      </BottomSheet>

      {/* Theme picker */}
      <div className="bg-(--color_bg_card) rounded-2xl p-6 border border-(--color_border)">
        <h2 className="text-base font-semibold text-white mb-4">Цвет темы</h2>
        <div className="grid grid-cols-8 gap-3">
          {/* Standalone dark / light / auto themes */}
          {/* Auto theme — CSS diagonal half-dark / half-light */}
          <button
            onClick={() => handleSpecialThemeChange('auto')}
            title="Авто"
            className="relative aspect-square w-full rounded-full border-2 transition-all overflow-hidden"
            style={{
              borderColor: activeSpecial === 'auto' ? 'rgba(128,128,128,0.8)' : 'rgba(128,128,128,0.3)',
              transform: activeSpecial === 'auto' ? 'scale(1.15)' : 'scale(1)',
            }}
          >
            <span className="absolute inset-0" style={{ background: '#F0EFED', clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
            <span className="absolute inset-0" style={{ background: '#22222A', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
          </button>
          {([
            { id: 'dark' as const, title: 'Тёмная', bg: 'linear-gradient(135deg, #22222A 0%, #0D0D11 100%)', border: 'rgba(255,255,255,0.15)', activeBorder: 'white' },
            { id: 'light' as const, title: 'Светлая', bg: 'linear-gradient(135deg, #F6F6F6 0%, #ECECEC 100%)', border: 'rgba(0,0,0,0.15)', activeBorder: 'rgba(0,0,0,0.5)' },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => handleSpecialThemeChange(t.id)}
              title={t.title}
              className="relative aspect-square w-full rounded-full border-2 transition-all"
              style={{
                background: t.bg,
                borderColor: activeSpecial === t.id ? t.activeBorder : t.border,
                transform: activeSpecial === t.id ? 'scale(1.15)' : 'scale(1)',
              }}
            />
          ))}
          {/* Hue presets */}
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.hue}
              onClick={() => handleThemeChange(preset.hue)}
              title={preset.label}
              className="relative aspect-square w-full rounded-full border-2 transition-all"
              style={{
                background: `hsl(${preset.hue}, 74%, 30%)`,
                borderColor: activeSpecial === null && activeHue === preset.hue ? 'var(--color_text_primary)' : 'var(--color_border)',
                transform: activeSpecial === null && activeHue === preset.hue ? 'scale(1.15)' : 'scale(1)',
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
          <AppInput
            type="text"
            label="Имя"
            value={nameField}
            onChange={(e) => setNameField(e.target.value)}
            placeholder="Ваше имя"
          />
          <AppInput
            type="email"
            label="Email"
            value={emailField}
            onChange={(e) => setEmailField(e.target.value)}
            placeholder="email@example.com"
          />
          <div>
            <label className="text-xs text-(--color_text_muted) mb-2 block">Пол</label>
            <div className="grid grid-cols-2 gap-2">
              {(['male', 'female'] as const).map((val) => (
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
                  {val === 'male' ? '👨 Мужской' : '👩 Женский'}
                </button>
              ))}
            </div>
          </div>
          <AccentButton
            onClick={handleSaveProfile}
            disabled={saving}
            loading={saving}
            loadingText="Сохранение..."
          >
            Сохранить
          </AccentButton>
        </div>

        {/* Password change */}
        <div className="mt-6 pt-6 border-t border-(--color_border)">
          <h3 className="text-sm font-semibold text-white mb-3">Сменить пароль</h3>
          <div className="space-y-3">
            <AppInput
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Текущий пароль"
            />
            <AppInput
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Новый пароль"
            />
            <AppInput
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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

      {/* Push notifications */}
      <div className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border)">
        <p className="text-sm font-semibold text-white mb-1">Уведомления</p>
        {!isStandalone && (isIos || isAndroid || !pushSupported) ? (
          <PwaInstructions platform={isIos ? 'ios' : isAndroid ? 'android' : 'desktop'} />
        ) : pushSupported ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-(--color_text_muted)">
              {pushPermission === 'granted' && 'Включены'}
              {pushPermission === 'default' && 'Получайте уведомления о сообщениях и тренировках'}
              {pushPermission === 'denied' && 'Заблокированы — разрешите в настройках браузера'}
            </p>
            {pushPermission !== 'denied' && (
              <button
                onClick={enablePush}
                disabled={pushLoading || pushPermission === 'granted'}
                className="shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-50"
                style={{
                  background: pushPermission === 'granted' ? 'var(--color_bg_card_hover)' : 'var(--color_primary_light)',
                  color: 'white',
                }}
              >
                {pushLoading ? '...' : pushPermission === 'granted' ? 'Включены' : 'Включить'}
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-(--color_text_muted)">Не поддерживаются в этом браузере</p>
        )}
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
          Vervel · ИП/Самозанятый · По вопросам: nazar9505@yandex.ru
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
  );
}
