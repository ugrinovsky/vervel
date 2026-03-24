import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authApi, type UserRole } from '@/api/auth';
import { useAuth } from '@/contexts/AuthContext';
import AppInput from '@/components/ui/AppInput';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<Set<'athlete' | 'trainer'>>(
    new Set(['athlete'])
  );
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const navigate = useNavigate();
  const { login } = useAuth();
  const inviteToken = new URLSearchParams(window.location.search).get('invite');
  const refId = new URLSearchParams(window.location.search).get('ref');

  const toggleRole = (role: 'athlete' | 'trainer') => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) {
        if (next.size > 1) next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
  };

  const getRole = (): UserRole => {
    if (selectedRoles.has('athlete') && selectedRoles.has('trainer')) return 'both';
    if (selectedRoles.has('trainer')) return 'trainer';
    return 'athlete';
  };

  const doRegister = async () => {
    const newErrors: typeof errors = {};
    if (!fullName.trim()) newErrors.fullName = 'Введите имя';
    if (!email) newErrors.email = 'Введите email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Некорректный email';
    if (!password) newErrors.password = 'Введите пароль';
    else if (password.length < 8 || !/(?=.*[a-zA-Zа-яА-Я])(?=.*\d)/.test(password))
      newErrors.password = 'Минимум 8 символов, буквы и цифры';
    if (!confirmPassword) newErrors.confirmPassword = 'Повторите пароль';
    else if (password !== confirmPassword) newErrors.confirmPassword = 'Пароли не совпадают';
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.register({
        fullName,
        email,
        password,
        role: getRole(),
        ...(gender ? { gender } : {}),
        ...(refId ? { refId: Number(refId) } : {}),
      });
      const { user, upgraded } = response.data as any;
      login(user);
      toast.success(upgraded ? `Роль обновлена. Добро пожаловать, ${user.fullName}!` : `Добро пожаловать, ${user.fullName}!`);
      navigate(inviteToken ? `/invite/${inviteToken}` : '/home');
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message;
      if (status === 409 || status === 422) {
        setErrors((p) => ({ ...p, email: message || 'Недопустимый email' }));
      } else if (status === 429) {
        toast.error(message || 'Слишком много попыток. Попробуйте позже.');
      } else {
        toast.error('Ошибка при регистрации');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doRegister();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doRegister();
  };

  return (
    <div
      className="h-full overflow-y-auto relative"
      style={{
        background:
          'radial-gradient(circle at 50% 52.5%, var(--color_primary) 0%, var(--color_primary_dark) 90%)',
      }}
    >
      <div className="min-h-full flex flex-col items-center justify-center p-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative w-full max-w-md z-10"
      >
        <div
          className="rounded-3xl p-8 border relative overflow-hidden glass"
          style={{ backgroundColor: 'rgb(var(--color_primary_dark_ch) / 0.95)' }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background:
                'radial-gradient(circle at 50% 0%, rgba(16,185,129,0.4), transparent 70%)',
            }}
          />

          <div className="text-center mb-8 relative z-10">
            <h1 className="text-4xl font-bold mb-2 text-white">Регистрация</h1>
            <p className="text-emerald-200/80">Создайте аккаунт в Vervel</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            {/* Honeypot — invisible to humans, traps bots */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }}
              aria-hidden="true"
            />
            <AppInput
              label="Имя"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: undefined })); }}
              placeholder="Ваше имя"
              error={errors.fullName}
              onKeyDown={handleKeyDown}
            />
            <AppInput
              label="Email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
              placeholder="your@email.com"
              error={errors.email}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onKeyDown={handleKeyDown}
            />
            <AppInput
              label="Пароль"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
              placeholder="Минимум 8 символов, буквы и цифры"
              error={errors.password}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onKeyDown={handleKeyDown}
            />
            <AppInput
              label="Подтвердите пароль"
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: undefined })); }}
              placeholder="Повторите пароль"
              error={errors.confirmPassword}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onKeyDown={handleKeyDown}
            />

            {/* Gender selection */}
            <div>
              <label className="block text-sm font-medium mb-3 text-(--color_text_secondary)">Пол</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGender(gender === 'male' ? null : 'male')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    gender === 'male'
                      ? 'border-emerald-400 bg-emerald-500/20 text-(--color_text_primary)'
                      : 'border-(--color_border) bg-(--color_bg_card) text-(--color_text_muted)'
                  }`}
                >
                  <div className="text-2xl mb-1">♂</div>
                  <div className="text-sm font-medium">Мужской</div>
                </button>
                <button
                  type="button"
                  onClick={() => setGender(gender === 'female' ? null : 'female')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    gender === 'female'
                      ? 'border-emerald-400 bg-emerald-500/20 text-(--color_text_primary)'
                      : 'border-(--color_border) bg-(--color_bg_card) text-(--color_text_muted)'
                  }`}
                >
                  <div className="text-2xl mb-1">♀</div>
                  <div className="text-sm font-medium">Женский</div>
                </button>
              </div>
            </div>

            {/* Role selection */}
            <div>
              <label className="block text-sm font-medium mb-3 text-(--color_text_secondary)">Я являюсь</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => toggleRole('athlete')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    selectedRoles.has('athlete')
                      ? 'border-emerald-400 bg-emerald-500/20 text-(--color_text_primary)'
                      : 'border-(--color_border) bg-(--color_bg_card) text-(--color_text_muted)'
                  }`}
                >
                  <div className="text-2xl mb-1">🏃</div>
                  <div className="text-sm font-medium">Атлет</div>
                </button>
                <button
                  type="button"
                  onClick={() => toggleRole('trainer')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    selectedRoles.has('trainer')
                      ? 'border-emerald-400 bg-emerald-500/20 text-(--color_text_primary)'
                      : 'border-(--color_border) bg-(--color_bg_card) text-(--color_text_muted)'
                  }`}
                >
                  <div className="text-2xl mb-1">🏋️</div>
                  <div className="text-sm font-medium">Тренер</div>
                </button>
              </div>
              {selectedRoles.size === 2 && (
                <p className="text-xs text-emerald-300/60 mt-2 text-center">
                  Вы будете и атлетом, и тренером
                </p>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-lg relative overflow-hidden group main-button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10">
                {loading ? 'Регистрация...' : 'Создать аккаунт'}
              </span>
            </motion.button>
          </form>

          <p className="text-center mt-6 text-sm text-emerald-200/70 relative z-10">
            Уже есть аккаунт?{' '}
            <Link
              to="/login"
              className="text-emerald-400 hover:text-emerald-300 font-medium transition"
            >
              Войти
            </Link>
          </p>
        </div>
      </motion.div>
      </div>
    </div>
  );
}
