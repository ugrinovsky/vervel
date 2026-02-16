import { privateApi } from './http/privateApi';

export interface AthleteListItem {
  id: number;
  fullName: string | null;
  email: string;
  status: 'active' | 'pending';
  linkedAt: string;
}

export interface TrainerGroupItem {
  id: number;
  name: string;
  athleteCount: number;
  createdAt: string;
}

export interface InviteData {
  token: string;
  link: string;
}

export const trainerApi = {
  // Athletes
  listAthletes: () =>
    privateApi.get<{ success: boolean; data: AthleteListItem[] }>('/trainer/athletes'),
  addByEmail: (email: string) =>
    privateApi.post<{ success: boolean; data: AthleteListItem }>('/trainer/athletes/by-email', {
      email,
    }),
  addByQr: (athleteId: number) =>
    privateApi.post<{ success: boolean; data: AthleteListItem }>('/trainer/athletes/by-qr', {
      athleteId,
    }),
  generateInvite: () =>
    privateApi.post<{ success: boolean; data: InviteData }>('/trainer/athletes/invite'),
  removeAthlete: (athleteId: number) => privateApi.delete(`/trainer/athletes/${athleteId}`),

  // Athlete data
  getAthleteStats: (athleteId: number, from: string, to: string) =>
    privateApi.get(`/trainer/athletes/${athleteId}/stats`, { params: { from, to } }),
  getAthleteAvatar: (athleteId: number, params?: Record<string, string>) =>
    privateApi.get(`/trainer/athletes/${athleteId}/avatar`, { params }),

  // Groups
  listGroups: () =>
    privateApi.get<{ success: boolean; data: TrainerGroupItem[] }>('/trainer/groups'),
  createGroup: (name: string) =>
    privateApi.post<{ success: boolean; data: TrainerGroupItem }>('/trainer/groups', { name }),
  updateGroup: (id: number, name: string) => privateApi.put(`/trainer/groups/${id}`, { name }),
  deleteGroup: (id: number) => privateApi.delete(`/trainer/groups/${id}`),
  getGroupAthletes: (groupId: number) =>
    privateApi.get<{ success: boolean; data: AthleteListItem[] }>(
      `/trainer/groups/${groupId}/athletes`
    ),
  addAthleteToGroup: (groupId: number, athleteId: number) =>
    privateApi.post(`/trainer/groups/${groupId}/athletes`, { athleteId }),
  removeAthleteFromGroup: (groupId: number, athleteId: number) =>
    privateApi.delete(`/trainer/groups/${groupId}/athletes/${athleteId}`),
};
