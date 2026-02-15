import ActivityScreen from '@/screens/ActivityScreen/ActivityScreen';
import AnalyticsScreen from '@/screens/AnalyticsScreen/AnalyticsScreen';
import AvatarScreen from '@/screens/AvatarScreen';
import ProfileScreen from '@/screens/ProfileScreen/ProfileScreen';
import WorkoutForm from '@/screens/WorkoutForm/WorkoutForm';
import {
  ChartBarIcon,
  PlusIcon,
  CalendarIcon,
  UserIcon,
  Cog6ToothIcon,
  SparklesIcon,
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

export const routes: RouteItem[] = [
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
];
