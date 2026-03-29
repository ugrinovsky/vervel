import ActivityScreen from '@/screens/ActivityScreen/ActivityScreen';
import AnalyticsScreen from '@/screens/AnalyticsScreen/AnalyticsScreen';
import AvatarScreen from '@/screens/AvatarScreen/AvatarScreen';
import ProfileScreen from '@/screens/ProfileScreen/ProfileScreen';
import WorkoutForm from '@/screens/WorkoutForm/WorkoutForm';
import StreakScreen from '@/screens/StreakScreen/StreakScreen';
import TrainerTodayScreen from '@/screens/TrainerTodayScreen/TrainerTodayScreen';
import TrainerGroupsListScreen from '@/screens/TrainerGroupsListScreen/TrainerGroupsListScreen';
import TrainerAthletesListScreen from '@/screens/TrainerAthletesListScreen/TrainerAthletesListScreen';
import TrainerCalendarScreen from '@/screens/TrainerCalendarScreen/TrainerCalendarScreen';
import TrainerTemplatesScreen from '@/screens/TrainerTemplatesScreen/TrainerTemplatesScreen';
import TrainerExerciseLibraryScreen from '@/screens/TrainerExerciseLibraryScreen/TrainerExerciseLibraryScreen';
import AthleteMyTeamScreen from '@/screens/AthleteMyTeamScreen/AthleteMyTeamScreen';
import DialogsScreen from '@/screens/DialogsScreen/DialogsScreen';
import TrainerTeamScreen from '@/screens/TrainerTeamScreen/TrainerTeamScreen';
import {
  ChartBarIcon,
  PlusIcon,
  CalendarIcon,
  UserIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  ClockIcon,
  UsersIcon,
  RectangleStackIcon,
  BookOpenIcon,
  TrophyIcon,
  ChatBubbleLeftRightIcon,
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
    path: '/dialogs',
    label: 'Диалоги',
    icon: ChatBubbleLeftRightIcon,
    element: <DialogsScreen />,
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
    path: '/calendar',
    label: 'Календарь',
    icon: CalendarIcon,
    element: <ActivityScreen />,
    toolbarPosition: 'left',
  },
  {
    path: '/home',
    label: 'Avatar',
    icon: UserIcon,
    element: <AvatarScreen />,
    toolbarPosition: 'center',
  },
  {
    path: '/streak',
    label: 'Ачивки',
    icon: TrophyIcon,
    element: <StreakScreen />,
    // убрана из тулбара — доступна из профиля
  },
  {
    path: '/my-team',
    label: 'Команда',
    icon: UserGroupIcon,
    element: <AthleteMyTeamScreen />,
    toolbarPosition: 'right',
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
];

/** Routes for trainers (different navigation) */
export const trainerRoutes: RouteItem[] = [
  {
    path: '/dialogs',
    label: 'Диалоги',
    icon: ChatBubbleLeftRightIcon,
    element: <DialogsScreen />,
    toolbarPosition: 'left',
  },
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
    // убрана из тулбара — доступна из TrainerTeamScreen
  },
  {
    path: '/trainer/athletes',
    label: 'Атлеты',
    icon: UsersIcon,
    element: <TrainerAthletesListScreen />,
    // убрана из тулбара — доступна из TrainerTeamScreen
  },
  {
    path: '/trainer/team',
    label: 'Команда',
    icon: UsersIcon,
    element: <TrainerTeamScreen />,
    toolbarPosition: 'left',
  },
  {
    path: '/trainer/templates',
    label: 'Шаблоны',
    icon: RectangleStackIcon,
    element: <TrainerTemplatesScreen />,
    toolbarPosition: 'right',
  },
  {
    path: '/trainer/calendar',
    label: 'Календарь',
    icon: CalendarIcon,
    element: <TrainerCalendarScreen />,
    toolbarPosition: 'right',
  },
  {
    path: '/trainer/library',
    label: 'Упражнения',
    icon: BookOpenIcon,
    element: <TrainerExerciseLibraryScreen />,
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
