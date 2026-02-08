import { privateApi } from './http/privateApi';

export interface AvatarStats {
  zoneIntensities: Record<string, number>;
  totalWorkouts: number;
  period: string;
}

export const avatarApi = {
  getZoneIntensities: (params?: {
    period?: 'day' | 'week' | 'month' | 'year' | 'all';
    from?: string;
    to?: string;
  }) => privateApi.get<{ success: boolean; data: AvatarStats }>('/avatar/stats', { params }),
};
