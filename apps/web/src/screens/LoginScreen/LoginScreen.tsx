import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { authApi } from '@/api/auth';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

// Генерируем ВСЕ значения для звезд ОДИН РАЗ
const STARS = [...Array(150)].map((_, i) => ({
  id: i,
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  initialOpacity: Math.random() * 0.7 + 0.3,
  duration: Math.random() * 30 + 20,
  x1: Math.random() * 200 - 100,
  x2: Math.random() * 200 - 100,
  x3: Math.random() * 200 - 100,
  x4: Math.random() * 200 - 100,
  y1: Math.random() * 200 - 100,
  y2: Math.random() * 200 - 100,
  y3: Math.random() * 200 - 100,
  y4: Math.random() * 200 - 100,
}));

const ASTEROIDS = [...Array(8)].map((_, i) => ({
  id: i,
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  opacity: Math.random() * 0.3 + 0.2,
  duration: Math.random() * 10 + 15,
  y1: Math.random() * 50,
  y2: Math.random() * 30 + 20,
  x1: Math.random() * 50,
  x2: Math.random() * 30 + 20,
}));

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authApi.login({ email, password });
      const { token, user } = response.data;
      const tokenValue = typeof token === 'string' ? token : token?.token || '';

      localStorage.setItem('token', tokenValue);
      localStorage.setItem('user', JSON.stringify(user));

      toast.success(`Добро пожаловать, ${user.fullName}!`);
      navigate('/');
    } catch (error) {
      toast.error('Неверный email или пароль');
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
      {/* СЛОЙ 1: ДВИЖУЩИЕСЯ ЗВЕЗДЫ (z-0) */}
      <div className="absolute inset-0 overflow-hidden z-0">
        {STARS.map((star) => (
          <motion.div
            key={star.id}
            className="absolute w-0.5 h-0.5 bg-white rounded-full"
            style={{
              top: star.top,
              left: star.left,
              opacity: star.initialOpacity,
            }}
            animate={{
              x: [star.x1, star.x2, star.x3, star.x4],
              y: [star.y1, star.y2, star.y3, star.y4],
              scale: [1, 1.5, 1, 2, 1],
              opacity: [
                star.initialOpacity * 0.5,
                star.initialOpacity,
                star.initialOpacity * 0.5,
                star.initialOpacity * 0.8,
                star.initialOpacity * 0.5,
              ],
            }}
            transition={{
              duration: star.duration,
              repeat: Infinity,
              ease: 'linear',
              times: [0, 0.3, 0.6, 0.8, 1],
            }}
          />
        ))}
      </div>

      {/* СЛОЙ 2: Планеты и туманности (z-5) */}
      <div className="absolute inset-0 overflow-hidden z-5">
        {/* Планета в углу */}
        <motion.div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full"
          style={{
            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2), rgb(var(--color_primary_ch) / 0.8))`,
            filter: 'blur(30px)',
          }}
          animate={{
            x: mousePosition.x,
            y: mousePosition.y,
          }}
          transition={{ type: 'spring', stiffness: 50, damping: 30 }}
        />

        {/* Вторая планета */}
        <motion.div
          className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full"
          style={{
            background: `radial-gradient(circle at 70% 70%, rgb(var(--color_primary_light_ch) / 0.3), rgb(var(--color_primary_dark_ch) / 0.9))`,
            filter: 'blur(40px)',
          }}
          animate={{
            x: -mousePosition.x * 0.5,
            y: -mousePosition.y * 0.5,
          }}
          transition={{ type: 'spring', stiffness: 30, damping: 20 }}
        />

        {/* Орбитальные кольца */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-[800px] h-[800px]">
            <motion.div
              className="absolute inset-0 border border-emerald-500/10 rounded-full"
              style={{
                borderWidth: '1px',
                borderStyle: 'solid',
              }}
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 100,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
            <motion.div
              className="absolute inset-[100px] border border-emerald-400/10 rounded-full"
              style={{
                borderWidth: '1px',
                borderStyle: 'dashed',
              }}
              animate={{
                rotate: -360,
              }}
              transition={{
                duration: 150,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </div>
        </div>

        {/* Парящие астероиды - фиксированные значения */}
        {ASTEROIDS.map((asteroid) => (
          <motion.div
            key={`asteroid-${asteroid.id}`}
            className="absolute w-3 h-3 rounded-full"
            style={{
              background: `rgb(var(--color_primary_light_ch) / ${asteroid.opacity})`,
              top: asteroid.top,
              left: asteroid.left,
              filter: 'blur(1px)',
            }}
            animate={{
              y: [0, asteroid.y1, 0, -asteroid.y2, 0],
              x: [0, asteroid.x1, asteroid.x2, asteroid.x1 * 0.4, 0],
              rotate: [0, 180, 360],
              scale: [1, 1.2, 1, 0.8, 1],
            }}
            transition={{
              duration: asteroid.duration,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* СЛОЙ 3: Карточка логина (z-10) */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.8,
          ease: 'easeOut',
        }}
        className="relative w-full max-w-md z-10"
        style={{
          transform: `translate(${mousePosition.x * 0.05}px, ${mousePosition.y * 0.05}px)`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        <div
          className="rounded-3xl p-8 border relative overflow-hidden background glass"
          style={{
            backgroundColor: 'rgb(var(--color_primary_dark_ch) / 0.95)',
          }}
        >
          {/* Эффект свечения */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background:
                'radial-gradient(circle at 50% 0%, rgba(16,185,129,0.4), transparent 70%)',
            }}
          />

          {/* Заголовок */}
          <div className="text-center mb-8 relative z-10">
            <h1 className="text-5xl font-bold mb-2 text-white">Vervel</h1>
            <p className="text-emerald-200/80">Войдите в свой аккаунт</p>
          </div>

          {/* Форма */}
          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2 text-emerald-100">Email</label>
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            {/* Пароль */}
            <div>
              <label className="block text-sm font-medium mb-2 text-emerald-100">Пароль</label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-emerald-400 hover:text-emerald-300 transition"
                >
                  {showPassword ? '🌙' : '☀️'}
                </button>
              </div>
            </div>

            {/* Дополнительно */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center space-x-2 text-emerald-100">
                <input
                  type="checkbox"
                  className="rounded border-emerald-400 bg-emerald-900/20 text-emerald-400 focus:ring-emerald-400/20"
                />
                <span>Запомнить меня</span>
              </label>
              <a href="#" className="text-emerald-400 hover:text-emerald-300 transition">
                Забыли пароль?
              </a>
            </div>

            {/* Кнопка входа */}
            <motion.button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-lg relative overflow-hidden group main-button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10 flex items-center justify-center">
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Вход...
                  </>
                ) : (
                  'Войти в космос'
                )}
              </span>
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background:
                    'linear-gradient(135deg, var(--color_primary_light), var(--color_primary))',
                }}
              />
            </motion.button>
          </form>

          {/* Тестовые данные */}
          <motion.div
            className="mt-8 p-4 rounded-xl border relative overflow-hidden"
            style={{
              backgroundColor: 'rgba(14, 92, 77, 0.2)',
              borderColor: 'rgba(16, 185, 129, 0.2)',
            }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="flex items-center mb-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></span>
              <span className="text-xs text-emerald-200/70">Тестовый доступ</span>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-emerald-100">
                <span className="text-emerald-300/50">Email:</span> test@example.com
              </p>
              <p className="text-emerald-100">
                <span className="text-emerald-300/50">Пароль:</span> 123456
              </p>
            </div>
          </motion.div>

          {/* Ссылка на регистрацию */}
          <p className="text-center mt-6 text-sm text-emerald-200/70">
            Нет аккаунта?{' '}
            <a href="#" className="text-emerald-400 hover:text-emerald-300 font-medium transition">
              Создать
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
