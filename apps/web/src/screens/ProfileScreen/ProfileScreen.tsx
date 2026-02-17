import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import { profileApi, type ProfileData } from '@/api/profile';
import { trainerApi, type WorkoutTemplate } from '@/api/trainer';
import { ZONE_LABELS } from '@/constants/AnalyticsConstants';
import { THEME_PRESETS, getStoredHue, saveHue } from '@/util/theme';
import { useAuth } from '@/contexts/AuthContext';
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { logout, isAthlete, isTrainer } = useAuth();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Settings form
  const [nameField, setNameField] = useState('');
  const [emailField, setEmailField] = useState('');
  const [saving, setSaving] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Theme
  const [activeHue, setActiveHue] = useState(getStoredHue);

  // Templates (for trainers)
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState<'crossfit' | 'bodybuilding' | 'cardio'>('crossfit');
  const [templateDescription, setTemplateDescription] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    loadProfile();
    if (isTrainer) {
      loadTemplates();
    }
  }, [isTrainer]);

  useEffect(() => {
    if (data) {
      setNameField(data.user.fullName || '');
      setEmailField(data.user.email);
    }
  }, [data]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await profileApi.getProfile();
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch {
      toast.error('Не удалось загрузить профиль');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await trainerApi.getWorkoutTemplates();
      setTemplates(response.data.data);
    } catch {
      toast.error('Ошибка загрузки шаблонов');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const response = await profileApi.updateProfile({
        fullName: nameField,
        email: emailField,
      });
      if (response.data.success) {
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem(
          'user',
          JSON.stringify({ ...stored, ...response.data.data.user })
        );
        setData((prev) =>
          prev ? { ...prev, user: response.data.data.user } : prev
        );
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

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateType('crossfit');
    setTemplateDescription('');
    setShowTemplateForm(true);
  };

  const handleEditTemplate = (template: WorkoutTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateType(template.workoutType);
    setTemplateDescription(template.description || '');
    setShowTemplateForm(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Укажите название шаблона');
      return;
    }

    try {
      setSavingTemplate(true);
      const payload = {
        name: templateName,
        workoutType: templateType,
        exercises: [],
        description: templateDescription || undefined,
        isPublic: false,
      };

      if (editingTemplate) {
        await trainerApi.updateWorkoutTemplate(editingTemplate.id, payload);
        toast.success('Шаблон обновлён');
      } else {
        await trainerApi.createWorkoutTemplate(payload);
        toast.success('Шаблон создан');
      }

      setShowTemplateForm(false);
      loadTemplates();
    } catch {
      toast.error('Ошибка сохранения шаблона');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Удалить этот шаблон?')) return;

    try {
      await trainerApi.deleteWorkoutTemplate(id);
      toast.success('Шаблон удалён');
      loadTemplates();
    } catch {
      toast.error('Ошибка удаления');
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

  if (loading) {
    return (
      <Screen>
        <div className="p-4 flex items-center justify-center min-h-[60vh]">
          <div className="text-[var(--color_text_muted)]">Загрузка...</div>
        </div>
      </Screen>
    );
  }

  if (!data) return null;

  const topZoneLabel =
    data.stats.topZones[0]
      ? ZONE_LABELS[data.stats.topZones[0].zone] || data.stats.topZones[0].zone
      : '—';

  return (
    <Screen>
      <div className="p-4 w-full max-w-2xl mx-auto">
        <ScreenHeader
          icon="👤"
          title="Профиль"
          description="Управление аккаунтом и настройки"
        />

        {/* User Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--color_bg_card)] rounded-2xl p-6 border border-[var(--color_border)] mb-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--color_primary_light)] to-[var(--color_primary)] flex items-center justify-center text-2xl font-bold text-white shrink-0">
              {getInitials()}
            </div>
            <div className="min-w-0">
              <div className="text-xl font-bold text-white truncate">
                {data.user.fullName || 'Без имени'}
              </div>
              <div className="text-sm text-[var(--color_text_muted)] truncate">
                {data.user.email}
              </div>
              <div className="text-xs text-[var(--color_text_muted)] mt-1">
                Участник с {formatDate(data.user.createdAt)}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <div className="bg-[var(--color_bg_card)] rounded-xl p-4 border border-[var(--color_border)] text-center">
            <div className="text-2xl font-bold text-white">
              {data.stats.totalWorkouts}
            </div>
            <div className="text-xs text-[var(--color_text_muted)] mt-1">
              Тренировок
            </div>
          </div>
          <div className="bg-[var(--color_bg_card)] rounded-xl p-4 border border-[var(--color_border)] text-center">
            <div className="text-2xl font-bold text-white">
              {data.stats.streak}
            </div>
            <div className="text-xs text-[var(--color_text_muted)] mt-1">
              Дней подряд
            </div>
            {data.stats.longestStreak > 0 && (
              <div className="text-xs text-[var(--color_text_muted)] mt-2">
                Рекорд: {data.stats.longestStreak}
              </div>
            )}
          </div>
          <div className="bg-[var(--color_bg_card)] rounded-xl p-4 border border-[var(--color_border)] text-center">
            <div className="text-2xl font-bold text-white text-base">
              {topZoneLabel}
            </div>
            <div className="text-xs text-[var(--color_text_muted)] mt-1">
              Топ зона
            </div>
          </div>
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--color_bg_card)] rounded-2xl p-6 border border-[var(--color_border)] mb-6 cursor-pointer hover:bg-[var(--color_bg_card_hover)] transition-colors"
          onClick={() => navigate('/streak')}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Ачивки и Streak</h2>
              <p className="text-sm text-[var(--color_text_muted)]">
                Нажмите, чтобы посмотреть ваши достижения
              </p>
            </div>
            <div className="text-3xl">🏆</div>
          </div>
        </motion.div>

        {/* Theme picker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-[var(--color_bg_card)] rounded-2xl p-6 border border-[var(--color_border)] mb-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Цвет темы</h2>
          <div className="flex flex-wrap gap-3">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.hue}
                onClick={() => {
                  setActiveHue(preset.hue);
                  saveHue(preset.hue);
                }}
                title={preset.label}
                className="relative w-10 h-10 rounded-full border-2 transition-all"
                style={{
                  background: `hsl(${preset.hue}, 74%, 30%)`,
                  borderColor:
                    activeHue === preset.hue
                      ? 'white'
                      : 'rgba(255,255,255,0.15)',
                  transform: activeHue === preset.hue ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <label className="text-xs text-[var(--color_text_muted)]">
              Свой цвет
            </label>
            <input
              type="range"
              min={0}
              max={359}
              value={activeHue}
              onChange={(e) => {
                const hue = Number(e.target.value);
                setActiveHue(hue);
                saveHue(hue);
              }}
              className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${Array.from({ length: 12 }, (_, i) => `hsl(${i * 30}, 74%, 30%)`).join(', ')})`,
              }}
            />
            <div
              className="w-8 h-8 rounded-lg border border-[var(--color_border)]"
              style={{ background: `hsl(${activeHue}, 74%, 30%)` }}
            />
          </div>
        </motion.div>

        {/* Workout Templates (for trainers) */}
        {isTrainer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.27 }}
            className="bg-[var(--color_bg_card)] rounded-2xl p-6 border border-[var(--color_border)] mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Шаблоны тренировок</h2>
              {!showTemplateForm && (
                <button
                  onClick={handleCreateTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color_primary_light)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <PlusIcon className="w-4 h-4" />
                  Создать
                </button>
              )}
            </div>

            {/* Create/Edit Form */}
            <AnimatePresence>
              {showTemplateForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 p-4 bg-[var(--color_bg_card_hover)] rounded-xl border border-[var(--color_border)]"
                >
                  <h3 className="text-sm font-semibold text-white mb-3">
                    {editingTemplate ? 'Редактировать шаблон' : 'Новый шаблон'}
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-[var(--color_text_muted)] mb-1 block">
                        Название
                      </label>
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Название шаблона..."
                        className="w-full bg-[var(--color_bg_input)] border border-[var(--color_border)] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[var(--color_primary_light)] transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-[var(--color_text_muted)] mb-1 block">
                        Тип тренировки
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['crossfit', 'bodybuilding', 'cardio'] as const).map((type) => (
                          <button
                            key={type}
                            onClick={() => setTemplateType(type)}
                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                              templateType === type
                                ? 'bg-[var(--color_primary_light)] text-white'
                                : 'bg-[var(--color_bg_card)] text-[var(--color_text_muted)] hover:text-white'
                            }`}
                          >
                            {type === 'crossfit' ? 'CrossFit' : type === 'bodybuilding' ? 'Силовая' : 'Кардио'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-[var(--color_text_muted)] mb-1 block">
                        Описание (опционально)
                      </label>
                      <textarea
                        value={templateDescription}
                        onChange={(e) => setTemplateDescription(e.target.value)}
                        placeholder="Описание шаблона..."
                        rows={2}
                        className="w-full bg-[var(--color_bg_input)] border border-[var(--color_border)] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[var(--color_primary_light)] transition-colors resize-none"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveTemplate}
                        disabled={savingTemplate}
                        className="flex-1 py-2 rounded-lg bg-[var(--color_primary_light)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {savingTemplate ? 'Сохранение...' : editingTemplate ? 'Сохранить' : 'Создать'}
                      </button>
                      <button
                        onClick={() => setShowTemplateForm(false)}
                        disabled={savingTemplate}
                        className="px-4 py-2 rounded-lg bg-[var(--color_bg_card)] text-[var(--color_text_muted)] text-sm hover:text-white transition-colors disabled:opacity-50"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Templates List */}
            {loadingTemplates ? (
              <div className="text-center py-6 text-[var(--color_text_muted)] text-sm">
                Загрузка...
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-6 text-[var(--color_text_muted)] text-sm">
                Пока нет шаблонов. Создайте первый!
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[var(--color_bg_card_hover)] hover:bg-[var(--color_border)] transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-white truncate">
                          {template.name}
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color_primary_light)] text-white shrink-0">
                          {template.workoutType === 'crossfit' ? 'CrossFit' : template.workoutType === 'bodybuilding' ? 'Силовая' : 'Кардио'}
                        </span>
                      </div>
                      {template.description && (
                        <div className="text-xs text-[var(--color_text_muted)] mt-1 truncate">
                          {template.description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="p-1.5 text-[var(--color_text_muted)] hover:text-white transition-colors"
                        title="Редактировать"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-1.5 text-[var(--color_text_muted)] hover:text-red-400 transition-colors"
                        title="Удалить"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[var(--color_bg_card)] rounded-2xl p-6 border border-[var(--color_border)] mb-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Настройки</h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-[var(--color_text_muted)] mb-1 block">
                Имя
              </label>
              <input
                type="text"
                value={nameField}
                onChange={(e) => setNameField(e.target.value)}
                className="w-full bg-[var(--color_bg_input)] border border-[var(--color_border)] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--color_primary_light)] transition-colors"
                placeholder="Ваше имя"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color_text_muted)] mb-1 block">
                Email
              </label>
              <input
                type="email"
                value={emailField}
                onChange={(e) => setEmailField(e.target.value)}
                className="w-full bg-[var(--color_bg_input)] border border-[var(--color_border)] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--color_primary_light)] transition-colors"
                placeholder="email@example.com"
              />
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full py-3 rounded-xl text-sm font-medium bg-[var(--color_primary_light)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>

          {/* Password change */}
          <div className="mt-6 pt-6 border-t border-[var(--color_border)]">
            <h3 className="text-sm font-semibold text-white mb-3">
              Сменить пароль
            </h3>
            <div className="space-y-3">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-[var(--color_bg_input)] border border-[var(--color_border)] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--color_primary_light)] transition-colors"
                placeholder="Текущий пароль"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[var(--color_bg_input)] border border-[var(--color_border)] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--color_primary_light)] transition-colors"
                placeholder="Новый пароль"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[var(--color_bg_input)] border border-[var(--color_border)] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--color_primary_light)] transition-colors"
                placeholder="Подтвердите пароль"
              />
              <button
                onClick={handleChangePassword}
                disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="w-full py-3 rounded-xl text-sm font-medium bg-[var(--color_bg_card_hover)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {savingPassword ? 'Сохранение...' : 'Сменить пароль'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* QR Code for athletes */}
        {isAthlete && data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-[var(--color_bg_card)] rounded-2xl p-6 border border-[var(--color_border)] mb-6"
          >
            <h2 className="text-lg font-semibold text-white mb-3">QR-код для тренера</h2>
            <p className="text-sm text-[var(--color_text_muted)] mb-4">
              Покажите этот код тренеру, чтобы он мог добавить вас
            </p>
            <div className="flex items-center justify-center p-4 bg-white rounded-xl">
              <div className="text-center">
                <div className="text-4xl font-mono font-bold text-black">
                  ID: {data.user.id}
                </div>
                <div className="text-xs text-gray-500 mt-1">{data.user.email}</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-xl text-sm font-medium bg-[var(--color_bg_card)] text-[var(--color_text_muted)] border border-[var(--color_border)] hover:bg-[var(--color_bg_card_hover)] hover:text-white transition-colors"
          >
            Выйти из аккаунта
          </button>
        </motion.div>
      </div>
    </Screen>
  );
}
