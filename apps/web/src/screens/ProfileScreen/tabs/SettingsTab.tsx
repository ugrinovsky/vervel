import { useState, useEffect, useCallback } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import {
  useFeatureFlags,
  applyUiMode,
  MODE_FLAGS,
  type FeatureFlags,
} from '@/hooks/useFeatureFlags';
import type { ClientPreferences } from '@/types/clientPreferences';
import { UI_MODE_ORDER, uiModeDescription, uiModeLabel } from '@/util/uiModeCopy';
import { useNavigate } from 'react-router';
import AnimatedBlock from '@/components/ui/AnimatedBlock';
import toast from 'react-hot-toast';
import { authApi } from '@/api/auth';
import { profileApi, type ProfileData } from '@/api/profile';
import { useAuth, useActiveMode } from '@/contexts/AuthContext';
import { userRoleFromApiString } from '@/util/userRole';

import {
  ThemeController,
  THEME_PRESETS,
  DEFAULT_HUE,
  type SpecialTheme,
} from '@/util/ThemeController';
import { isOAuthPlaceholderEmail } from '@/util/oauthPlaceholderEmail';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import AccentButton from '@/components/ui/AccentButton';
import GhostButton from '@/components/ui/GhostButton';
import AppInput from '@/components/ui/AppInput';
import ToggleGroup from '@/components/ui/ToggleGroup';
import GenderToggle from '@/components/ui/GenderToggle';
import {
  isPwaStandalone,
  detectPwaPlatform,
  isMobileBrowser,
} from '@/components/PwaInstallHint/pwaInstallShared';
import { PwaInstructions } from '@/components/PwaInstallHint/PwaInstallHint';
import SectionGroup from '@/components/ui/SectionGroup';
import Switch from '@/components/ui/Switch';
import { SectionCard, SectionCardRow } from '@/components/ui/SectionCard';

interface Props {
  data: ProfileData;
  onProfileUpdate: (updatedUser: ProfileData['user']) => void;
}

export default function SettingsTab({ data, onProfileUpdate }: Props) {
  const navigate = useNavigate();
  const { logout, updateUser, user } = useAuth();
  const { isTrainer } = useActiveMode();
  const {
    permission: pushPermission,
    loading: pushLoading,
    enable: enablePush,
    supported: pushSupported,
  } = usePushNotifications();
  const isStandalone = isPwaStandalone();
  const pwaPlatform = detectPwaPlatform();

  const [nameField, setNameField] = useState(data.user.fullName || '');
  const [emailField, setEmailField] = useState(() =>
    isOAuthPlaceholderEmail(data.user.email) ? '' : data.user.email
  );
  const [genderField, setGenderField] = useState<'male' | 'female' | null>(
    data.user.gender ?? null
  );
  const [bodyWeightField, setBodyWeightField] = useState('');
  const [currentBodyWeight, setCurrentBodyWeight] = useState<number | null>(null);
  const [savingWeight, setSavingWeight] = useState(false);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [activeHue, setActiveHue] = useState(() => data.user.themeHue ?? DEFAULT_HUE);
  const [activeSpecial, setActiveSpecial] = useState<SpecialTheme | null>(() =>
    ThemeController.getStoredSpecial()
  );
  const [initialHue] = useState(() => data.user.themeHue ?? DEFAULT_HUE);
  const [initialSpecial] = useState<SpecialTheme | null>(() => ThemeController.getStoredSpecial());

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'general' | 'bug' | 'feature' | 'other'>(
    'general'
  );
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackContact, setFeedbackContact] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  /** VK Mini App (и др. встроенные клиенты): выход почти сразу перезапишется авто-логином — кнопку не показываем. */
  const [hideLogoutInEmbeddedShell, setHideLogoutInEmbeddedShell] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void import('@vkontakte/vk-bridge')
      .then((m) => {
        if (cancelled) return;
        try {
          if (m.default.isEmbedded()) {
            setHideLogoutInEmbeddedShell(true);
          }
        } catch {
          /* ignore */
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setNameField(data.user.fullName || '');
    setEmailField(isOAuthPlaceholderEmail(data.user.email) ? '' : data.user.email);
    setGenderField(data.user.gender ?? null);
  }, [data.user]);

  useEffect(() => {
    profileApi
      .getMeasurements('body_weight', 1)
      .then((res) => {
        const latest = res.data?.data?.[0];
        if (latest) setCurrentBodyWeight(latest.value);
      })
      .catch(() => {});
  }, []);

  const themeChanged =
    activeSpecial !== initialSpecial || (activeSpecial === null && activeHue !== initialHue);

  const handleThemeChange = (hue: number) => {
    setActiveSpecial(null);
    setActiveHue(hue);
    ThemeController.change(hue);
  };

  const handleSpecialThemeChange = (type: SpecialTheme) => {
    setActiveSpecial(type);
    ThemeController.changeSpecial(type);
  };

  const handleApplyTheme = () => {
    toast.success('Тема применена');
    setTimeout(() => window.location.reload(), 800);
  };

  const handleSaveWeight = async () => {
    const value = parseFloat(bodyWeightField.replace(',', '.'));
    if (!value || value <= 0 || value > 300) {
      toast.error('Введите корректный вес (кг)');
      return;
    }
    try {
      setSavingWeight(true);
      await profileApi.logMeasurement({ type: 'body_weight', value });
      setBodyWeightField('');
      setCurrentBodyWeight(value);
      toast.success('Вес сохранён');
    } catch {
      toast.error('Ошибка при сохранении веса');
    } finally {
      setSavingWeight(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const payload: Parameters<typeof profileApi.updateProfile>[0] = {
        fullName: nameField,
        gender: genderField,
      };
      if (!isOAuthPlaceholderEmail(data.user.email)) {
        payload.email = emailField;
      } else if (emailField.trim().length > 0) {
        payload.email = emailField.trim();
      }
      const response = await profileApi.updateProfile(payload);
      if (response.data.success) {
        const updatedUser = response.data.data.user;
        if (user) {
          const role = userRoleFromApiString(updatedUser.role) ?? user.role;
          updateUser({
            ...user,
            ...updatedUser,
            fullName: updatedUser.fullName ?? '',
            role,
            themeHue: activeHue,
          });
        }
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
      const response = await profileApi.changePassword({ currentPassword, newPassword });
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

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* сеть или уже нет сессии — всё равно чистим клиент */
    }
    logout();
    navigate('/login');
  };

  const isPasswordlessOAuth = isOAuthPlaceholderEmail(data.user.email);

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

  return (
    <AnimatedBlock key="settings" className="space-y-0">
      <BottomSheet
        id="settings-feedback"
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        emoji="💬"
        title="Написать нам"
      >
        <div className="space-y-3">
          <ToggleGroup
            cols={2}
            value={feedbackType}
            onChange={setFeedbackType}
            options={[
              { value: 'general', label: '💬 Общее' },
              { value: 'bug', label: '🐛 Баг' },
              { value: 'feature', label: '✨ Идея' },
              { value: 'other', label: '📝 Другое' },
            ]}
          />
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

      <SectionGroup title="Аккаунт">
        <div className="bg-(--color_bg_card) rounded-2xl p-6 border border-(--color_border)">
          <h3 className="text-sm font-semibold text-white mb-4">Личные данные</h3>
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
              placeholder={
                isOAuthPlaceholderEmail(data.user.email)
                  ? 'Укажите email, если нужны уведомления на почту'
                  : 'email@example.com'
              }
            />
            {isOAuthPlaceholderEmail(data.user.email) && (
              <p className="text-xs text-(--color_text_muted) -mt-2">
                Вход без пароля: в поле выше не настоящая почта. Укажи свой email, если нужны письма
                с сервиса.
              </p>
            )}
            <GenderToggle value={genderField} onChange={setGenderField} />
            <AccentButton
              onClick={handleSaveProfile}
              disabled={saving}
              loading={saving}
              loadingText="Сохранение..."
            >
              Сохранить
            </AccentButton>
          </div>
        </div>

        {!isTrainer && (
          <div className="bg-(--color_bg_card) rounded-2xl p-6 border border-(--color_border)">
            <h3 className="text-sm font-semibold text-white mb-1">Вес тела</h3>
            <p className="text-xs text-(--color_text_muted) mb-3 leading-relaxed">
              Для расчёта нагрузки в упражнениях с весом тела и рейтинга. История сохраняется.
            </p>
            {currentBodyWeight != null && currentBodyWeight > 0 && (
              <p className="text-xs text-emerald-400 mb-2">Текущий: {currentBodyWeight} кг</p>
            )}
            <div className="space-y-2">
              <AppInput
                type="number"
                value={bodyWeightField}
                onChange={(e) => setBodyWeightField(e.target.value)}
                placeholder="Вес в кг, напр. 75.5"
              />
              <AccentButton
                onClick={handleSaveWeight}
                disabled={savingWeight || !bodyWeightField}
                loading={savingWeight}
                loadingText="..."
                className="w-full"
              >
                Сохранить вес
              </AccentButton>
            </div>
          </div>
        )}

        {!isPasswordlessOAuth && (
          <div className="bg-(--color_bg_card) rounded-2xl p-6 border border-(--color_border)">
            <h3 className="text-sm font-semibold text-white mb-3">Пароль</h3>
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
              <AccentButton
                onClick={handleChangePassword}
                disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                loading={savingPassword}
                loadingText="Сохранение..."
              >
                Сменить пароль
              </AccentButton>
            </div>
          </div>
        )}
      </SectionGroup>

      <SectionGroup title="Оформление">
        <div className="bg-(--color_bg_card) rounded-2xl p-6 border border-(--color_border)">
          <h3 className="text-sm font-semibold text-white mb-4">Тема</h3>
          <div className="grid grid-cols-8 gap-3">
            <button
              onClick={() => handleSpecialThemeChange('auto')}
              title="Авто"
              className="relative aspect-square w-full rounded-full border-2 transition-all overflow-hidden"
              style={{
                borderColor:
                  activeSpecial === 'auto' ? 'rgba(128,128,128,0.8)' : 'rgba(128,128,128,0.3)',
                transform: activeSpecial === 'auto' ? 'scale(1.15)' : 'scale(1)',
              }}
            >
              <span
                className="absolute inset-0"
                style={{ background: '#F0EFED', clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
              />
              <span
                className="absolute inset-0"
                style={{ background: '#22222A', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
              />
            </button>
            {(
              [
                {
                  id: 'dark' as const,
                  title: 'Тёмная',
                  bg: 'linear-gradient(135deg, #22222A 0%, #0D0D11 100%)',
                  border: 'rgba(255,255,255,0.15)',
                  activeBorder: 'white',
                },
                {
                  id: 'light' as const,
                  title: 'Светлая',
                  bg: 'linear-gradient(135deg, #F6F6F6 0%, #ECECEC 100%)',
                  border: 'rgba(0,0,0,0.15)',
                  activeBorder: 'rgba(0,0,0,0.5)',
                },
              ] as const
            ).map((t) => (
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
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.hue}
                onClick={() => handleThemeChange(preset.hue)}
                title={preset.label}
                className="relative aspect-square w-full rounded-full border-2 transition-all"
                style={{
                  background: `hsl(${preset.hue}, 74%, 30%)`,
                  borderColor:
                    activeSpecial === null && activeHue === preset.hue
                      ? 'var(--color_text_primary)'
                      : 'var(--color_border)',
                  transform:
                    activeSpecial === null && activeHue === preset.hue ? 'scale(1.15)' : 'scale(1)',
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
          {themeChanged && (
            <div className="mt-4">
              <AccentButton onClick={handleApplyTheme}>Применить тему</AccentButton>
            </div>
          )}
        </div>
      </SectionGroup>

      <FeatureSettingsSection user={user} updateUser={updateUser} isTrainer={isTrainer} />

      <SectionGroup title="Уведомления">
        <div className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border)">
          <h3 className="text-sm font-semibold text-white mb-2">Push в браузере</h3>
          {!isStandalone && (isMobileBrowser() || !pushSupported) ? (
            <PwaInstructions platform={pwaPlatform} />
          ) : pushSupported ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-(--color_text_muted) leading-relaxed">
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
                    background:
                      pushPermission === 'granted'
                        ? 'var(--color_bg_card_hover)'
                        : 'var(--color_primary_light)',
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
      </SectionGroup>

      <SectionGroup title="Помощь и документы">
        <div className="bg-(--color_bg_card) rounded-2xl border border-(--color_border) overflow-hidden">
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left text-sm font-medium text-white hover:bg-(--color_bg_card_hover) transition-colors"
          >
            <span>💬 Написать нам</span>
            <span className="text-(--color_text_muted) text-xs shrink-0">→</span>
          </button>
          <div className="border-t border-(--color_border) px-5 py-4">
            <p className="text-xs font-semibold text-(--color_text_muted) uppercase tracking-wider mb-3">
              Документы
            </p>
            <div className="space-y-2">
              {[
                { path: '/docs/privacy', label: 'Политика конфиденциальности' },
                { path: '/docs/offer', label: 'Публичная оферта' },
                { path: '/docs/seller', label: 'Реквизиты продавца' },
              ].map(({ path, label }) => (
                <button
                  key={path}
                  type="button"
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
        </div>
      </SectionGroup>

      {!hideLogoutInEmbeddedShell && (
        <SectionGroup title="Сессия" showBreakAfter={false}>
          <GhostButton variant="solid" onClick={handleLogout} className="w-full">
            {isPasswordlessOAuth ? 'Выйти из Vervel' : 'Выйти из аккаунта'}
          </GhostButton>
          {isPasswordlessOAuth && (
            <p className="text-center text-[11px] text-(--color_text_muted) leading-snug px-1">
              На сервере отзывается токен и снимается cookie входа; здесь сбрасывается локальный
              профиль.
            </p>
          )}
        </SectionGroup>
      )}
    </AnimatedBlock>
  );
}

// ─── Feature settings section ─────────────────────────────────────────────────

type FeatKey = Extract<keyof ClientPreferences, `feat${string}`>;

type FeatItemConfig = {
  key: FeatKey;
  label: string;
  /** Общая подсказка; при необходимости переопределяется hintTrainer / hintAthlete */
  hint?: string;
  hintTrainer?: string;
  hintAthlete?: string;
  trainerOnly?: boolean;
  athleteOnly?: boolean;
  /** Включение смысла имеет только при включённой цепочке родителей (рекурсивно) */
  dependsOn?: FeatKey;
};

function featRowHint(item: FeatItemConfig, isTrainer: boolean): string | undefined {
  if (isTrainer && item.hintTrainer != null) return item.hintTrainer;
  if (!isTrainer && item.hintAthlete != null) return item.hintAthlete;
  return item.hint;
}

const FEAT_GROUPS: Array<{ title: string; items: FeatItemConfig[] }> = [
  {
    title: 'AI-ассистент',
    items: [{ key: 'featAi', label: 'AI-функции', hint: 'Генерация, распознавание по фото, чат' }],
  },
  {
    title: 'Кабинет тренера',
    items: [
      {
        key: 'featTrainerTemplates',
        label: 'Шаблоны тренировок',
        hint: 'Сохранённые программы и быстрое назначение',
        trainerOnly: true,
      },
      {
        key: 'featTrainerLibrary',
        label: 'Каталог упражнений',
        hint: 'Справочник движений в кабинете',
        trainerOnly: true,
      },
      {
        key: 'featTrainerCrm',
        label: 'CRM',
        hint: 'Заявки, статусы клиентов и аналитика',
        trainerOnly: true,
      },
    ],
  },
  {
    title: 'Аналитика и прогресс',
    items: [
      {
        key: 'featAnalytics',
        label: 'Аналитика по периодам',
        hint: 'Объём и интенсивность по неделям и месяцам, сводки тренировок',
        athleteOnly: true,
      },
      {
        key: 'featProgression',
        label: 'Сила и прогрессия',
        hint: 'Рекорды по упражнениям, динамика весов и рабочих объёмов',
        athleteOnly: true,
        dependsOn: 'featAnalytics',
      },
      {
        key: 'featAdvancedAnalytics',
        label: 'Сложная аналитика',
        hint: 'Периодизация ATL/CTL/TSB и ACWR (острая к хронической нагрузке)',
        athleteOnly: true,
        dependsOn: 'featAnalytics',
      },
      {
        key: 'featAvatar',
        label: 'Карта нагрузки',
        hint: 'Силуэт с зонами нагрузки по группам мышц',
        athleteOnly: true,
      },
      {
        key: 'featStreaks',
        label: 'Серии и достижения',
        hint: 'Дни подряд с тренировками и значки за активность',
        athleteOnly: true,
      },
    ],
  },
  {
    title: 'Социальное',
    items: [
      {
        key: 'featTeams',
        label: 'Атлеты и группы',
        hintTrainer:
          'Ростер клиентов, группы, приглашения (ссылка или QR), назначение тренировок в календаре',
        hintAthlete: 'Состав команды тренера, группы, приглашения и назначенные тренировки',
      },
      {
        key: 'featDialogs',
        label: 'Диалоги и чаты',
        hintTrainer: 'Личные и групповые чаты с атлетами',
        hintAthlete: 'Сообщения с тренером и участниками групп',
      },
      {
        key: 'featLeaderboard',
        label: 'Лидерборд',
        hint: 'Сравнение показателей между участниками команды',
        dependsOn: 'featTeams',
      },
      {
        key: 'featVideoCalls',
        label: 'Видеозвонки',
        hint: 'Звонок из чата, если браузер и устройство это поддерживают',
      },
    ],
  },
];

const FEAT_FLAG_MAP: Record<FeatKey, keyof FeatureFlags> = {
  featAi: 'ai',
  featAnalytics: 'analytics',
  featProgression: 'progression',
  featPeriodization: 'advancedAnalytics',
  featAdvancedAnalytics: 'advancedAnalytics',
  featTeams: 'teams',
  featDialogs: 'dialogs',
  featLeaderboard: 'leaderboard',
  featStreaks: 'streaks',
  featAvatar: 'avatar',
  featVideoCalls: 'videoCalls',
  featTrainerTemplates: 'trainerTemplates',
  featTrainerLibrary: 'trainerLibrary',
  featTrainerCrm: 'trainerCrm',
};

const FEAT_ITEMS_FLAT = FEAT_GROUPS.flatMap((g) => g.items);

function isFeatItemKey(s: string): s is FeatKey {
  return FEAT_ITEMS_FLAT.some((item) => item.key === s);
}

/** Все потомки по dependsOn (транзитивно), выключаются вместе с родителем */
function collectDescendantKeysToDisable(rootKey: FeatKey): FeatKey[] {
  const direct = FEAT_ITEMS_FLAT.filter((i) => i.dependsOn === rootKey).map((i) => i.key);
  return [...direct, ...direct.flatMap((k) => collectDescendantKeysToDisable(k))];
}

function labelForFeatKey(key: FeatKey): string {
  return FEAT_ITEMS_FLAT.find((i) => i.key === key)?.label ?? key;
}

/** Сравнение с пресетом: featPeriodization в БД считается включённой сложной аналитикой */
function prefMatchesPreset(
  prefs: ClientPreferences | undefined,
  key: FeatKey,
  presetVal: boolean
): boolean {
  if (key === 'featAdvancedAnalytics') {
    const eff = prefs?.featAdvancedAnalytics ?? prefs?.featPeriodization ?? false;
    return eff === presetVal;
  }
  return prefs?.[key] === presetVal;
}

/** Первый выключенный предок в цепочке dependsOn, или null если цепочка выполнена */
function firstBlockedAncestorKey(item: FeatItemConfig, flags: FeatureFlags): FeatKey | null {
  let p: FeatKey | undefined = item.dependsOn;
  while (p != null) {
    if (!(flags[FEAT_FLAG_MAP[p]] ?? false)) return p;
    const parentRow = FEAT_ITEMS_FLAT.find((i) => i.key === p);
    p = parentRow?.dependsOn;
  }
  return null;
}

function FeatureSettingsSection({
  user,
  updateUser,
  isTrainer,
}: {
  user: import('@/contexts/auth-types').AuthUser | null;
  updateUser: (u: import('@/contexts/auth-types').AuthUser) => void;
  isTrainer: boolean;
}) {
  const nav = useNavigate();
  const { activeMode } = useActiveMode();
  const flags = useFeatureFlags();
  const currentMode = user?.clientPreferences?.uiMode;
  const [applyingMode, setApplyingMode] = useState<string | null>(null);
  const [confirmMode, setConfirmMode] = useState<NonNullable<ClientPreferences['uiMode']> | null>(
    null
  );

  const handleToggle = useCallback(
    async (key: FeatKey, value: boolean) => {
      if (!user) return;
      try {
        const patch: Partial<ClientPreferences> = { [key]: value };
        if (!value) {
          for (const dep of collectDescendantKeysToDisable(key)) {
            patch[dep] = false;
          }
        }
        const res = await profileApi.patchClientPreferences(patch);
        updateUser({ ...user, clientPreferences: res.data.data.clientPreferences });
      } catch {
        toast.error('Не удалось сохранить настройку');
      }
    },
    [user, updateUser]
  );

  const handleApplyMode = useCallback(
    async (mode: NonNullable<ClientPreferences['uiMode']>) => {
      if (!user) return;
      setApplyingMode(mode);
      setConfirmMode(null);
      try {
        const prefs = await applyUiMode(mode);
        updateUser({ ...user, clientPreferences: prefs });
        toast.success(`Режим «${uiModeLabel(mode, isTrainer ? 'trainer' : 'athlete')}» применён`);
      } catch {
        toast.error('Не удалось применить режим');
      } finally {
        setApplyingMode(null);
      }
    },
    [user, updateUser, isTrainer]
  );

  // Compute if flags diverge from the current mode preset
  const isDiverged =
    currentMode != null &&
    (() => {
      const preset = MODE_FLAGS[currentMode];
      return Object.entries(preset).some(([raw, presetVal]) => {
        if (typeof presetVal !== 'boolean') return false;
        if (!isFeatItemKey(raw)) return false;
        return !prefMatchesPreset(user?.clientPreferences, raw, presetVal);
      });
    })();

  return (
    <SectionGroup title="Функции приложения">
      {/* Mode switcher */}
      <div className="bg-(--color_bg_card) rounded-2xl border border-(--color_border) p-4 mb-3">
        <p className="text-sm font-semibold text-white mb-1">Режим интерфейса</p>
        <p className="text-xs text-(--color_text_muted) mb-3">
          {currentMode ? uiModeLabel(currentMode, isTrainer ? 'trainer' : 'athlete') : 'Не выбран'}
          {isDiverged && <span className="ml-2 text-orange-400/80">· изменён вручную</span>}
        </p>
        <div className="grid gap-2">
          {UI_MODE_ORDER.map((mode) => {
            const isActive = currentMode === mode && !isDiverged;
            return (
              <button
                key={mode}
                type="button"
                disabled={!!applyingMode}
                onClick={() => {
                  if (isDiverged || currentMode !== mode) {
                    setConfirmMode(mode);
                  }
                }}
                className={`rounded-xl px-4 py-3 text-left text-sm transition-colors flex items-start justify-between gap-3 ${
                  isActive
                    ? 'border border-emerald-500/40 bg-emerald-500/10 text-white'
                    : 'border border-(--color_border) bg-(--color_bg_card_hover) text-(--color_text_muted) hover:text-white'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="block font-medium">
                    {uiModeLabel(mode, isTrainer ? 'trainer' : 'athlete')}
                  </span>
                  <p className="mt-1 text-[11px] leading-snug text-(--color_text_muted)">
                    {uiModeDescription(mode, isTrainer ? 'trainer' : 'athlete')}
                  </p>
                </div>
                <div className="shrink-0 pt-0.5 text-right">
                  {isActive && (
                    <span className="text-emerald-400 text-xs whitespace-nowrap">✓ активен</span>
                  )}
                  {applyingMode === mode && (
                    <span className="text-xs text-(--color_text_muted)">...</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Confirm dialog */}
        {confirmMode && (
          <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10 text-sm">
            <p className="text-white mb-2">
              Применить режим «{uiModeLabel(confirmMode, isTrainer ? 'trainer' : 'athlete')}»? Все
              флаги функций будут сброшены к настройкам этого режима.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleApplyMode(confirmMode)}
                className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold"
              >
                Применить
              </button>
              <button
                type="button"
                onClick={() => setConfirmMode(null)}
                className="flex-1 py-1.5 rounded-lg bg-white/5 text-(--color_text_muted) text-xs"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Individual toggles */}
      {FEAT_GROUPS.map((group) => {
        const items = group.items.filter((item) => {
          if (item.athleteOnly && isTrainer) return false;
          if (item.trainerOnly && !isTrainer) return false;
          return true;
        });
        if (!items.length) return null;
        return (
          <SectionCard key={group.title} title={group.title}>
            {items.map((item, idx) => {
              const isEnabled = flags[FEAT_FLAG_MAP[item.key]] ?? false;
              const blockedBy = firstBlockedAncestorKey(item, flags);
              const depUnmet = blockedBy != null;

              return (
                <SectionCardRow
                  key={item.key}
                  label={item.label}
                  description={
                    depUnmet && blockedBy
                      ? `Сначала включите «${labelForFeatKey(blockedBy)}»`
                      : featRowHint(item, isTrainer)
                  }
                  dimmed={depUnmet}
                  showDivider={idx < items.length - 1}
                  trailing={
                    <Switch
                      checked={isEnabled}
                      disabled={depUnmet}
                      onCheckedChange={(v) => void handleToggle(item.key, v)}
                    />
                  }
                />
              );
            })}
          </SectionCard>
        );
      })}

      <button
        type="button"
        onClick={() => {
          if (!user) return;
          const patch =
            isTrainer && activeMode === 'trainer'
              ? { trainerOnboardingComplete: false }
              : { athleteOnboardingComplete: false };
          updateUser({ ...user, clientPreferences: { ...user.clientPreferences, ...patch } });
          void profileApi.patchClientPreferences(patch).catch(() => {});
          nav('/onboarding');
        }}
        className="w-full text-xs text-(--color_text_muted) hover:text-emerald-400/90 transition-colors py-2 text-center"
      >
        Пройти настройку заново →
      </button>
    </SectionGroup>
  );
}
