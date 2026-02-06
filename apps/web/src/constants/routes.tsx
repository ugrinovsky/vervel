import ActivityScreen from '@/screens/ActivityScreen';
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
    path: '/activity',
    label: 'Activity',
    icon: ChartBarIcon,
    element: <ActivityScreen />,
    toolbarPosition: 'left',
  },
  {
    path: '/exercises',
    label: 'Exercises',
    icon: SparklesIcon,
    element: <AvatarScreen />,
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
