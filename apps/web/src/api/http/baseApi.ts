import axios, { AxiosInstance, isAxiosError } from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

/** В консоли: localStorage.setItem('VERVEL_DEBUG_401','1') — перед редиректом на /login печатается тело 401 (для withUnauthorizedRedirect). */
const DEBUG_401_KEY = 'VERVEL_DEBUG_401';

/** Clears client auth hints and forces login — same outcome as the private API 401 interceptor. */
export function clearAuthAndRedirectToLogin() {
  try {
    localStorage.removeItem('user');
    localStorage.removeItem('activeMode');
  } catch {
    /* ignore */
  }
  window.location.href = '/login';
}

/**
 * For API clients with redirectOn401: false — on 401 clears auth and navigates to login.
 * Returns undefined when handling 401; otherwise the fulfilled value of fn.
 */
export async function withUnauthorizedRedirect<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 401) {
      try {
        if (typeof localStorage !== 'undefined' && localStorage.getItem(DEBUG_401_KEY) === '1') {
          console.warn('[VERVEL_DEBUG_401]', e.config?.method?.toUpperCase(), e.config?.url, e.response?.data);
        }
      } catch {
        /* ignore */
      }
      clearAuthAndRedirectToLogin();
      return undefined;
    }
    throw e;
  }
}

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

      if (redirectOn401 && isAxiosError(error) && error.response?.status === 401) {
        clearAuthAndRedirectToLogin();
        return Promise.reject(new Error('Не авторизован'));
      }

      return Promise.reject(error);
    }
  );

  return instance;
}
