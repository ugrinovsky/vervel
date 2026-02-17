import ActivityScreen from '@/screens/ActivityScreen/ActivityScreen';
import AnalyticsScreen from '@/screens/AnalyticsScreen/AnalyticsScreen';
import AvatarScreen from '@/screens/AvatarScreen';
import ProfileScreen from '@/screens/ProfileScreen/ProfileScreen';
import WorkoutForm from '@/screens/WorkoutForm/WorkoutForm';
import StreakScreen from '@/screens/StreakScreen/StreakScreen';
import TrainerTodayScreen from '@/screens/TrainerTodayScreen/TrainerTodayScreen';
import TrainerGroupsListScreen from '@/screens/TrainerGroupsListScreen/TrainerGroupsListScreen';
import TrainerAthletesListScreen from '@/screens/TrainerAthletesListScreen/TrainerAthletesListScreen';
import TrainerCalendarScreen from '@/screens/TrainerCalendarScreen/TrainerCalendarScreen';
import TrainerPersonalScreen from '@/screens/TrainerPersonalScreen/TrainerPersonalScreen';
import {
  ChartBarIcon,
  PlusIcon,
  CalendarIcon,
  UserIcon,
  Cog6ToothIcon,
  SparklesIcon,
  UserGroupIcon,
  ClockIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

export interface RouteItem {
  path: string;
  label: string;
  icon: any;
  element?: any;
  toolbarPosition?: 'left' | 'center' | 'right';
  center?: boolean;
  isButton?: boolean;
  accent?: boolean;
}

/** Routes for athletes (default navigation) */
export const athleteRoutes: RouteItem[] = [
  {
    path: '/analytics',
    label: 'Аналитика',
    icon: ChartBarIcon,
    element: <AnalyticsScreen />,
    toolbarPosition: 'left',
  },
  {
    path: '/calendar',
    label: 'Календарь',
    icon: CalendarIcon,
    element: <ActivityScreen />,
    toolbarPosition: 'left',
  },
  {
    path: '/',
    label: 'Avatar',
    icon: UserIcon,
    element: <AvatarScreen />,
    toolbarPosition: 'center',
  },
  {
    path: '/profile',
    label: 'Профиль',
    icon: Cog6ToothIcon,
    element: <ProfileScreen />,
    toolbarPosition: 'right',
  },
  {
    path: '/workouts/new',
    label: 'Добавить',
    icon: PlusIcon,
    element: <WorkoutForm />,
    toolbarPosition: 'right',
    isButton: true,
    accent: true,
  },
  {
    path: '/achivements',
    label: 'Achivements',
    icon: SparklesIcon,
    element: <AvatarScreen />,
  },
  {
    path: '/streak',
    label: 'Streak',
    icon: SparklesIcon,
    element: <StreakScreen />,
  },
];

/** Routes for trainers (different navigation) */
export const trainerRoutes: RouteItem[] = [
  {
    path: '/trainer',
    label: 'Сегодня',
    icon: ClockIcon,
    element: <TrainerTodayScreen />,
    toolbarPosition: 'left',
  },
  {
    path: '/trainer/groups',
    label: 'Группы',
    icon: UserGroupIcon,
    element: <TrainerGroupsListScreen />,
    toolbarPosition: 'left',
  },
  {
    path: '/trainer/athletes',
    label: 'Атлеты',
    icon: UsersIcon,
    element: <TrainerAthletesListScreen />,
    toolbarPosition: 'left',
  },
  {
    path: '/trainer/calendar',
    label: 'Календарь',
    icon: CalendarIcon,
    element: <TrainerCalendarScreen />,
    toolbarPosition: 'right',
  },
  {
    path: '/profile',
    label: 'Профиль',
    icon: Cog6ToothIcon,
    element: <ProfileScreen />,
    toolbarPosition: 'right',
  },
];

/** All routes combined (for App.tsx route definitions) */
export const routes: RouteItem[] = [...athleteRoutes, ...trainerRoutes];
