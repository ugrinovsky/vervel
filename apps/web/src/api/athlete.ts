import { privateApi } from './http/privateApi';

export interface AthleteGroup {
  id: number;
  name: string;
  trainer: {
    id: number;
    fullName: string | null;
    email: string;
  };
  memberCount: number;
  chatId: number | null;
}

export interface AthleteTrainer {
  id: number;
  fullName: string | null;
  email: string;
  chatId: number | null;
}

export const athleteApi = {
  getMyGroups: () =>
    privateApi.get<{ success: boolean; data: AthleteGroup[] }>('/athlete/my-groups'),

  getMyTrainers: () =>
    privateApi.get<{ success: boolean; data: AthleteTrainer[] }>('/athlete/my-trainers'),

  getGroupChat: (groupId: number) =>
    privateApi.get<{ success: boolean; data: { chatId: number } }>(
      `/athlete/chats/group/${groupId}`
    ),

  getTrainerChat: (trainerId: number) =>
    privateApi.get<{ success: boolean; data: { chatId: number } }>(
      `/athlete/chats/trainer/${trainerId}`
    ),
};
