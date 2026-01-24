import ActivityScreen from '@/screens/ActivityScreen';
import AvatarScreen from '@/screens/AvatarScreen';
import { HomeIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export const routes = [
  {
    path: '/',
    label: 'Avatar',
    icon: HomeIcon,
    element: <AvatarScreen />,
  },
  {
    path: '/activity',
    label: 'Activity',
    icon: ChartBarIcon,
    element: <ActivityScreen />,
  },
] as const;
