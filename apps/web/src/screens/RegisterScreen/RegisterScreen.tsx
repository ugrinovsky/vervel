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
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const inviteToken = new URLSearchParams(window.location.search).get('invite');

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

    if (password !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }
    if (password.length < 6) {
      toast.error('Минимум 6 символов в пароле');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.register({
        fullName,
        email,
        password,
        role: getRole(),
      });
      const { user, token } = response.data;
      const tokenValue = typeof token === 'string' ? token : token?.token || '';
      login(user, tokenValue);
      toast.success(`Добро пожаловать, ${user.fullName}!`);
      navigate(inviteToken ? `/invite/${inviteToken}` : '/');
    } catch {
      toast.error('Ошибка при регистрации');
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
            <div>
              <label className="block text-sm font-medium mb-2 text-emerald-100">Имя</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50"
                placeholder="Ваше имя"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-emerald-100">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-emerald-100">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50"
                placeholder="Минимум 6 символов"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-emerald-100">
                Подтвердите пароль
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50"
                placeholder="Повторите пароль"
                required
              />
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
