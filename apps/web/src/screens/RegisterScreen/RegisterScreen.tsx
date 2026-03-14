import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authApi, type UserRole } from '@/api/auth';
import { useAuth } from '@/contexts/AuthContext';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      const { user, token, upgraded } = response.data as any;
      const tokenValue = typeof token === 'string' ? token : token?.token || '';
      login(user, tokenValue);
      toast.success(upgraded ? `Роль обновлена. Добро пожаловать, ${user.fullName}!` : `Добро пожаловать, ${user.fullName}!`);
      navigate(inviteToken ? `/invite/${inviteToken}` : '/');
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

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at 50% 52.5%, var(--color_primary) 0%, var(--color_primary_dark) 90%)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative w-full max-w-md z-10"
      >
        <div
          className="rounded-3xl p-8 border relative overflow-hidden background glass"
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
            <div>
              <label className="block text-sm font-medium mb-2 text-emerald-100">Имя</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: undefined })); }}
                className={`w-full px-3 py-2 rounded-lg bg-white/10 border text-white placeholder:text-white/50 ${errors.fullName ? 'border-red-400' : 'border-white/20'}`}
                placeholder="Ваше имя"
              />
              {errors.fullName && <p className="mt-1 text-xs text-red-400">{errors.fullName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-emerald-100">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                className={`w-full px-3 py-2 rounded-lg bg-white/10 border text-white placeholder:text-white/50 ${errors.email ? 'border-red-400' : 'border-white/20'}`}
                placeholder="your@email.com"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-emerald-100">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                className={`w-full px-3 py-2 rounded-lg bg-white/10 border text-white placeholder:text-white/50 ${errors.password ? 'border-red-400' : 'border-white/20'}`}
                placeholder="Минимум 8 символов, буквы и цифры"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-emerald-100">
                Подтвердите пароль
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: undefined })); }}
                className={`w-full px-3 py-2 rounded-lg bg-white/10 border text-white placeholder:text-white/50 ${errors.confirmPassword ? 'border-red-400' : 'border-white/20'}`}
                placeholder="Повторите пароль"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>}
            </div>

            {/* Gender selection */}
            <div>
              <label className="block text-sm font-medium mb-3 text-emerald-100">Пол</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGender(gender === 'male' ? null : 'male')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    gender === 'male'
                      ? 'border-emerald-400 bg-emerald-500/20 text-white'
                      : 'border-white/20 bg-white/5 text-white/60'
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
                      ? 'border-emerald-400 bg-emerald-500/20 text-white'
                      : 'border-white/20 bg-white/5 text-white/60'
                  }`}
                >
                  <div className="text-2xl mb-1">♀</div>
                  <div className="text-sm font-medium">Женский</div>
                </button>
              </div>
            </div>

            {/* Role selection */}
            <div>
              <label className="block text-sm font-medium mb-3 text-emerald-100">Я являюсь</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => toggleRole('athlete')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    selectedRoles.has('athlete')
                      ? 'border-emerald-400 bg-emerald-500/20 text-white'
                      : 'border-white/20 bg-white/5 text-white/60'
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
                      ? 'border-emerald-400 bg-emerald-500/20 text-white'
                      : 'border-white/20 bg-white/5 text-white/60'
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
  );
}
