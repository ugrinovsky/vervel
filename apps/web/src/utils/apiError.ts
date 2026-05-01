import { isAxiosError } from 'axios';
import { isRecord } from '@/utils/typeGuards';

/** Extract response data object from an Axios error, or null. */
export function getApiErrorData(err: unknown): Record<string, unknown> | null {
  if (isAxiosError(err)) {
    const d = err.response?.data;
    if (isRecord(d)) return d;
  }
  return null;
}

/** Extract a human-readable error message from an API error. */
export function getApiErrorMessage(err: unknown, fallback = 'Произошла ошибка'): string {
  const data = getApiErrorData(err);
  if (data !== null && typeof data.message === 'string') return data.message;
  if (err instanceof Error) return err.message;
  return fallback;
}
