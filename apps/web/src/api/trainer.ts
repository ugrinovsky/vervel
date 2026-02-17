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

export interface ChatMessage {
  id: number;
  content: string;
  senderId: number;
  sender: {
    id: number;
    fullName: string | null;
    email?: string;
  };
  createdAt: string;
}

export interface AssignedTo {
  type: 'group' | 'athlete';
  id: number;
  name: string;
}

export interface ExerciseData {
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
  notes?: string;
}

export interface WorkoutData {
  type: 'crossfit' | 'bodybuilding' | 'cardio';
  exercises: ExerciseData[];
  duration?: number;
  notes?: string;
}

export interface ScheduledWorkout {
  id: number;
  scheduledDate: string;
  workoutData: WorkoutData;
  assignedTo: AssignedTo[];
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string | null;
  templateId?: number | null;
  createdAt?: string;
}

export interface WorkoutTemplate {
  id: number;
  name: string;
  workoutType: 'crossfit' | 'bodybuilding' | 'cardio';
  exercises: ExerciseData[];
  description?: string | null;
  isPublic: boolean;
  createdAt?: string;
}

export interface TodayOverview {
  todayWorkouts: Array<{
    id: number;
    scheduledDate: string;
    workoutData: WorkoutData;
    assignedTo: AssignedTo[];
  }>;
  stats: {
    athleteCount: number;
    groupCount: number;
    todayWorkoutsCount: number;
  };
}

export const trainerApi = {
  // Today overview
  getTodayOverview: () =>
    privateApi.get<{ success: boolean; data: TodayOverview }>('/trainer/today'),

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

  // Chats
  getOrCreateGroupChat: (groupId: number) =>
    privateApi.get<{ success: boolean; data: { chatId: number } }>(
      `/trainer/chats/group/${groupId}`
    ),
  getOrCreateAthleteChat: (athleteId: number) =>
    privateApi.get<{ success: boolean; data: { chatId: number } }>(
      `/trainer/chats/athlete/${athleteId}`
    ),
  getChatMessages: (chatId: number, limit = 50, offset = 0) =>
    privateApi.get<{ success: boolean; data: ChatMessage[] }>(`/trainer/chats/${chatId}/messages`, {
      params: { limit, offset },
    }),
  sendMessage: (chatId: number, content: string) =>
    privateApi.post<{ success: boolean; data: ChatMessage }>(`/trainer/chats/${chatId}/messages`, {
      content,
    }),
  getLastMessage: (chatId: number) =>
    privateApi.get<{ success: boolean; data: ChatMessage | null }>(`/trainer/chats/${chatId}/last`),

  // Scheduled workouts
  getScheduledWorkouts: (from: string, to: string) =>
    privateApi.get<{ success: boolean; data: ScheduledWorkout[] }>('/trainer/scheduled-workouts', {
      params: { from, to },
    }),
  getTodayWorkouts: () =>
    privateApi.get<{ success: boolean; data: ScheduledWorkout[] }>(
      '/trainer/scheduled-workouts/today'
    ),
  createScheduledWorkout: (data: {
    scheduledDate: string;
    workoutData: WorkoutData;
    assignedTo: AssignedTo[];
    notes?: string;
    templateId?: number;
  }) =>
    privateApi.post<{ success: boolean; data: ScheduledWorkout }>(
      '/trainer/scheduled-workouts',
      data
    ),
  updateScheduledWorkout: (
    id: number,
    data: Partial<{
      scheduledDate: string;
      workoutData: WorkoutData;
      assignedTo: AssignedTo[];
      status: 'scheduled' | 'completed' | 'cancelled';
      notes: string;
    }>
  ) =>
    privateApi.put<{ success: boolean; data: ScheduledWorkout }>(
      `/trainer/scheduled-workouts/${id}`,
      data
    ),
  deleteScheduledWorkout: (id: number) =>
    privateApi.delete(`/trainer/scheduled-workouts/${id}`),

  // Workout templates
  getWorkoutTemplates: () =>
    privateApi.get<{ success: boolean; data: WorkoutTemplate[] }>('/trainer/workout-templates'),
  createWorkoutTemplate: (data: {
    name: string;
    workoutType: 'crossfit' | 'bodybuilding' | 'cardio';
    exercises: ExerciseData[];
    description?: string;
    isPublic?: boolean;
  }) =>
    privateApi.post<{ success: boolean; data: WorkoutTemplate }>('/trainer/workout-templates', data),
  updateWorkoutTemplate: (
    id: number,
    data: Partial<{
      name: string;
      workoutType: 'crossfit' | 'bodybuilding' | 'cardio';
      exercises: ExerciseData[];
      description: string;
      isPublic: boolean;
    }>
  ) =>
    privateApi.put<{ success: boolean; data: WorkoutTemplate }>(
      `/trainer/workout-templates/${id}`,
      data
    ),
  deleteWorkoutTemplate: (id: number) => privateApi.delete(`/trainer/workout-templates/${id}`),
};
