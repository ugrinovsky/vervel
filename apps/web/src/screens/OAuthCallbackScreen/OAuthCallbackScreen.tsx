import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { privateApi } from '@/api/http/privateApi';

export default function OAuthCallbackScreen() {
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    // Cookie was already set by the API redirect — just fetch the user profile
    const fetchUser = async () => {
      try {
        const response = await privateApi.get('/profile');

        login(response.data.data.user);
        toast.success('Успешный вход!');
        navigate('/home');
      } catch (error) {
        toast.error('Ошибка загрузки профиля');
        navigate('/login');
      }
    };

    fetchUser();
  }, [navigate, login]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background:
          'radial-gradient(circle at 50% 52.5%, var(--color_primary) 0%, var(--color_primary_dark) 90%)',
      }}
    >
      <div className="text-center">
        <div className="animate-spin h-12 w-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-white text-lg">Завершаем вход...</p>
      </div>
    </div>
  );
}
