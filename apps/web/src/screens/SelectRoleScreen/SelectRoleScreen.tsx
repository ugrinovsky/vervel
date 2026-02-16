import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authApi, type UserRole } from '@/api/auth';
import { useAuth } from '@/contexts/AuthContext';

export default function SelectRoleScreen() {
  const [selectedRoles, setSelectedRoles] = useState<Set<'athlete' | 'trainer'>>(
    new Set(['athlete'])
  );
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const token = searchParams.get('token');
  const userId = searchParams.get('userId');

  useEffect(() => {
    if (!token || !userId) {
      toast.error('Недействительная ссылка');
      navigate('/login');
    }
  }, [token, userId, navigate]);

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

  const handleSubmit = async () => {
    if (!userId || !token) return;

    setLoading(true);
    try {
      const response = await authApi.setRole({
        userId: parseInt(userId),
        role: getRole(),
      });

      login(response.data.user, token);
      toast.success('Добро пожаловать в Vervel!');
      navigate('/');
    } catch {
      toast.error('Ошибка сохранения роли');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          'radial-gradient(circle at 50% 52.5%, var(--color_primary) 0%, var(--color_primary_dark) 90%)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md"
      >
        <div
          className="rounded-3xl p-8 border border-white/20"
          style={{ backgroundColor: 'rgb(var(--color_primary_dark_ch) / 0.95)' }}
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 text-white">Выберите роль</h1>
            <p className="text-emerald-200/80">Кем вы будете в Vervel?</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => toggleRole('athlete')}
                className={`p-4 rounded-xl border text-center transition-all ${
                  selectedRoles.has('athlete')
                    ? 'border-emerald-400 bg-emerald-500/20 text-white'
                    : 'border-white/20 bg-white/5 text-white/60'
                }`}
              >
                <div className="text-3xl mb-2">🏃</div>
                <div className="font-medium">Атлет</div>
                <div className="text-xs text-white/60 mt-1">Тренируюсь сам</div>
              </button>

              <button
                type="button"
                onClick={() => toggleRole('trainer')}
                className={`p-4 rounded-xl border text-center transition-all ${
                  selectedRoles.has('trainer')
                    ? 'border-emerald-400 bg-emerald-500/20 text-white'
                    : 'border-white/20 bg-white/5 text-white/60'
                }`}
              >
                <div className="text-3xl mb-2">🏋️</div>
                <div className="font-medium">Тренер</div>
                <div className="text-xs text-white/60 mt-1">Тренирую других</div>
              </button>
            </div>

            {selectedRoles.size === 2 && (
              <p className="text-sm text-emerald-300/80 text-center">
                Вы будете и атлетом, и тренером
              </p>
            )}

            <motion.button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-lg main-button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? 'Сохранение...' : 'Продолжить'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
