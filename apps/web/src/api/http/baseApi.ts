import axios, { AxiosInstance } from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function createApi(): AxiosInstance {
  const instance = axios.create({
    baseURL: API_BASE,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error('API error', error.response?.data || error.message);

      if (error.response?.status === 401) {
        return Promise.reject(new Error('Не авторизован'));
      }

      const message = error.response?.data?.message || 'Ошибка API';
      return Promise.reject(new Error(message));
    }
  );

  return instance;
}
