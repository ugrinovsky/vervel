import { useState } from 'react';
import { useNavigate } from 'react-router';
import { authApi } from '@/api/auth';
import toast from 'react-hot-toast';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass p-8 rounded-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">🏋️ Vervel</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color_text_secondary)] mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--color_bg_input)] border border-[var(--color_border)] rounded-lg text-white focus:outline-none focus:border-[var(--color_primary_light)]"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color_text_secondary)] mb-2">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--color_bg_input)] border border-[var(--color_border)] rounded-lg text-white focus:outline-none focus:border-[var(--color_primary_light)]"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[var(--color_primary_light)] hover:bg-[rgb(5,150,105)] disabled:bg-[var(--color_bg_card)] text-white font-semibold rounded-lg transition"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-[var(--color_bg_card)] rounded-lg border border-[var(--color_border_light)]">
          <p className="text-xs text-[var(--color_text_muted)] mb-2">Dev credentials:</p>
          <p className="text-sm text-[var(--color_text_secondary)] font-mono">Email: test@example.com</p>
          <p className="text-sm text-[var(--color_text_secondary)] font-mono">Password: 123456</p>
        </div>
      </div>
    </div>
  );
}
