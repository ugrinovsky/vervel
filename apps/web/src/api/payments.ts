import { privateApi } from './http/privateApi';

export const paymentsApi = {
  /**
   * Создаёт платёж ЮКасса и возвращает ссылку для оплаты.
   * amount — одно из: 100, 250, 500, 1000 (рублей).
   */
  topup: (amount: number) =>
    privateApi.post<{ confirmationUrl: string }>('/payments/topup', { amount }),
};
