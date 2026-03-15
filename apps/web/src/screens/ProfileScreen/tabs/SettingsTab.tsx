import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { profileApi, type ProfileData } from '@/api/profile';
import { useAuth } from '@/contexts/AuthContext';
import { THEME_PRESETS, getStoredHue, saveHue } from '@/util/theme';
import BottomSheet from '@/components/BottomSheet/BottomSheet';

interface Props {
  data: ProfileData;
  onProfileUpdate: (updatedUser: ProfileData['user']) => void;
}

export default function SettingsTab({ data, onProfileUpdate }: Props) {
  const navigate = useNavigate();
  const { logout, login, user, token } = useAuth();

  const [nameField, setNameField] = useState(data.user.fullName || '');
  const [emailField, setEmailField] = useState(data.user.email);
  const [genderField, setGenderField] = useState<'male' | 'female' | null>(data.user.gender ?? null);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [activeHue, setActiveHue] = useState(getStoredHue);
  const themeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setActiveHue(hue);
    saveHue(hue);
    if (themeDebounceRef.current) clearTimeout(themeDebounceRef.current);
    themeDebounceRef.current = setTimeout(() => {
      profileApi.updateProfile({ themeHue: hue }).catch(() => {});
    }, 500);
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const response = await profileApi.updateProfile({ fullName: nameField, email: emailField, gender: genderField });
      if (response.data.success) {
        const updatedUser = response.data.data.user;
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...stored, ...updatedUser }));
        if (user && token) login({ ...user, ...updatedUser }, token);
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

      {/* Theme picker */}
      <div className="bg-(--color_bg_card) rounded-2xl p-6 border border-(--color_border)">
        <h2 className="text-base font-semibold text-white mb-4">Цвет темы</h2>
        <div className="grid grid-cols-6 gap-3">
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
                  {val === 'male' ? '♂ Мужской' : '♀ Женский'}
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
  );
}
