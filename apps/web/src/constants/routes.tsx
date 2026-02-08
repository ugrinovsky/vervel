import ActivityScreen from '@/screens/ActivityScreen/ActivityScreen';
import AnalyticsScreen from '@/screens/AnalyticsScreen/AnalyticsScreen';
import AvatarScreen from '@/screens/AvatarScreen';
import WorkoutForm from '@/screens/WorkoutForm/WorkoutForm';
import {
  ChartBarIcon,
  PlusIcon,
  AdjustmentsHorizontalIcon,
  UserIcon,
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
    path: '/calendar',
    label: 'Activity',
    icon: ChartBarIcon,
    element: <ActivityScreen />,
    toolbarPosition: 'left',
  },
  {
    path: '/analytics',
    label: 'Аналитика',
    icon: ChartBarIcon,
    element: <AnalyticsScreen />,
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
    path: '/achivements',
    label: 'Achivements',
    icon: SparklesIcon,
    element: <AvatarScreen />,
    toolbarPosition: 'right',
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: AdjustmentsHorizontalIcon,
    toolbarPosition: 'right',
  },
  {
    path: '/workouts/new',
    label: 'AddWorkout',
    icon: PlusIcon,
    element: <WorkoutForm />,
    toolbarPosition: 'right',
    isButton: true,
  },
];
