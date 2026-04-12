import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { privateApi } from '@/api/http/privateApi';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

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
        <div className="mx-auto mb-4 flex justify-center">
          <LoadingSpinner size="xl" variant="oauth" />
        </div>
        <p className="text-white text-lg">Завершаем вход...</p>
      </div>
    </div>
  );
}
