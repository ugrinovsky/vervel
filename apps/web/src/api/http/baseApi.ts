import axios, { AxiosInstance } from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function createApi(opts?: { redirectOn401?: boolean }): AxiosInstance {
  const { redirectOn401 = false } = opts ?? {};

  const instance = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error('API error', error.response?.data || error.message);

      if (redirectOn401 && error.response?.status === 401) {
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(new Error('Не авторизован'));
      }

      return Promise.reject(error);
    }
  );

  return instance;
}
