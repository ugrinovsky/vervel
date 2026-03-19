import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

export default function OAuthCallbackScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      toast.error('Ошибка авторизации');
      navigate('/login');
      return;
    }

    // Fetch user data with token
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        login(response.data.data.user, token);
        toast.success('Успешный вход!');
        navigate('/home');
      } catch (error) {
        toast.error('Ошибка загрузки профиля');
        navigate('/login');
      }
    };

    fetchUser();
  }, [searchParams, navigate, login]);

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
