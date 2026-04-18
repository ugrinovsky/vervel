import axios, { AxiosInstance, isAxiosError, type AxiosError } from 'axios';
import { clearVkLaunchParamsStorage } from '@/vk/vkLaunchParams';

/** Как в auth.ts: без VITE_API_URL Vite не подставит localhost, и axios уйдёт на origin SPA (5173) вместо API. */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333';

/**
 * Отладка 401: localStorage.setItem('VERVEL_DEBUG_401','1'), воспроизвести запрос.
 * После редиректа консоль очищается — тело ответа кладётся в sessionStorage:
 *   JSON.parse(sessionStorage.getItem('VERVEL_LAST_401_DEBUG') || 'null')
 */
const DEBUG_401_KEY = 'VERVEL_DEBUG_401';
const LAST_401_SESSION_KEY = 'VERVEL_LAST_401_DEBUG';

function persistLast401ForDebug(e: AxiosError) {
  try {
    if (typeof localStorage === 'undefined' || localStorage.getItem(DEBUG_401_KEY) !== '1') {
      return;
    }
    const cfg = e.config;
    const fullUrl =
      cfg?.baseURL != null ? `${String(cfg.baseURL).replace(/\/$/, '')}${cfg.url ?? ''}` : cfg?.url;
    sessionStorage.setItem(
      LAST_401_SESSION_KEY,
      JSON.stringify({
        at: new Date().toISOString(),
        method: cfg?.method?.toUpperCase(),
        url: fullUrl,
        status: e.response?.status,
        data: e.response?.data,
      })
    );
  } catch {
    /* ignore */
  }
}

/** Clears client auth hints and forces login — same outcome as the private API 401 interceptor. */
export function clearAuthAndRedirectToLogin() {
  try {
    localStorage.removeItem('user');
    localStorage.removeItem('activeMode');
    clearVkLaunchParamsStorage();
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
      persistLast401ForDebug(e);
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
        persistLast401ForDebug(error);
        clearAuthAndRedirectToLogin();
        return Promise.reject(new Error('Не авторизован'));
      }

      return Promise.reject(error);
    }
  );

  return instance;
}
