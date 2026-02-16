import { privateApi } from './http/privateApi';

export const inviteApi = {
  acceptInvite: (token: string) =>
    privateApi.post<{ success: boolean; message: string }>('/invite/accept', { token }),
  getQrData: () =>
    privateApi.get<{
      success: boolean;
      data: { athleteId: number; fullName: string | null; email: string };
    }>('/profile/qr-data'),
};
