import RouteLoading from '@/components/ui/RouteLoading';
import { lazy, Suspense } from 'react';
import type { ComponentType, ReactNode, SVGProps } from 'react';
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
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

const ActivityScreen = lazy(() => import('@/screens/ActivityScreen/ActivityScreen'));
const AnalyticsScreen = lazy(() => import('@/screens/AnalyticsScreen/AnalyticsScreen'));
const AvatarScreen = lazy(() => import('@/screens/AvatarScreen/AvatarScreen'));
const ProfileScreen = lazy(() => import('@/screens/ProfileScreen/ProfileScreen'));
const WorkoutForm = lazy(() => import('@/screens/WorkoutForm/WorkoutForm'));
const StreakScreen = lazy(() => import('@/screens/StreakScreen/StreakScreen'));
const TrainerTodayScreen = lazy(() => import('@/screens/TrainerTodayScreen/TrainerTodayScreen'));
const TrainerGroupsListScreen = lazy(
  () => import('@/screens/TrainerGroupsListScreen/TrainerGroupsListScreen')
);
const TrainerAthletesListScreen = lazy(
  () => import('@/screens/TrainerAthletesListScreen/TrainerAthletesListScreen')
);
const TrainerCalendarScreen = lazy(
  () => import('@/screens/TrainerCalendarScreen/TrainerCalendarScreen')
);
const TrainerTemplatesScreen = lazy(
  () => import('@/screens/TrainerTemplatesScreen/TrainerTemplatesScreen')
);
const TrainerExerciseLibraryScreen = lazy(
  () => import('@/screens/TrainerExerciseLibraryScreen/TrainerExerciseLibraryScreen')
);
const AthleteMyTeamScreen = lazy(() => import('@/screens/AthleteMyTeamScreen/AthleteMyTeamScreen'));
const DialogsScreen = lazy(() => import('@/screens/DialogsScreen/DialogsScreen'));
const TrainerTeamScreen = lazy(() => import('@/screens/TrainerTeamScreen/TrainerTeamScreen'));
const TrainerLeadsScreen = lazy(() => import('@/screens/TrainerLeadsScreen/TrainerLeadsScreen'));
const TrainerCrmScreen = lazy(() => import('@/screens/TrainerCrmScreen/TrainerCrmScreen'));

function withRouteSuspense(node: ReactNode) {
  return <Suspense fallback={<RouteLoading />}>{node}</Suspense>;
}

export type RouteNavIcon = ComponentType<SVGProps<SVGSVGElement>>;

export interface RouteItem {
  path: string;
  label: string;
  icon: RouteNavIcon;
  element?: ReactNode;
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
    element: withRouteSuspense(<DialogsScreen />),
    toolbarPosition: 'left',
  },
  {
    path: '/analytics',
    label: 'Аналитика',
    icon: ChartBarIcon,
    element: withRouteSuspense(<AnalyticsScreen />),
    toolbarPosition: 'left',
  },
  {
    path: '/calendar',
    label: 'Календарь',
    icon: CalendarIcon,
    element: withRouteSuspense(<ActivityScreen />),
    toolbarPosition: 'left',
  },
  {
    path: '/home',
    label: 'Avatar',
    icon: UserIcon,
    element: withRouteSuspense(<AvatarScreen />),
    toolbarPosition: 'center',
  },
  {
    path: '/streak',
    label: 'Ачивки',
    icon: TrophyIcon,
    element: withRouteSuspense(<StreakScreen />),
    // убрана из тулбара — доступна из профиля
  },
  {
    path: '/my-team',
    label: 'Команда',
    icon: UserGroupIcon,
    element: withRouteSuspense(<AthleteMyTeamScreen />),
    toolbarPosition: 'right',
  },
  {
    path: '/profile',
    label: 'Профиль',
    icon: Cog6ToothIcon,
    element: withRouteSuspense(<ProfileScreen />),
    toolbarPosition: 'right',
  },
  {
    path: '/workouts/new',
    label: 'Добавить',
    icon: PlusIcon,
    element: withRouteSuspense(<WorkoutForm />),
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
    element: withRouteSuspense(<DialogsScreen />),
    toolbarPosition: 'left',
  },
  {
    path: '/trainer',
    label: 'Сегодня',
    icon: ClockIcon,
    element: withRouteSuspense(<TrainerTodayScreen />),
    toolbarPosition: 'left',
  },
  {
    path: '/trainer/groups',
    label: 'Группы',
    icon: UserGroupIcon,
    element: withRouteSuspense(<TrainerGroupsListScreen />),
    // убрана из тулбара — доступна из TrainerTeamScreen
  },
  {
    path: '/trainer/athletes',
    label: 'Атлеты',
    icon: UsersIcon,
    element: withRouteSuspense(<TrainerAthletesListScreen />),
    // убрана из тулбара — доступна из TrainerTeamScreen
  },
  {
    path: '/trainer/team',
    label: 'Команда',
    icon: UsersIcon,
    element: withRouteSuspense(<TrainerTeamScreen />),
    toolbarPosition: 'left',
  },
  {
    path: '/trainer/leads',
    label: 'Лиды',
    icon: ClipboardDocumentListIcon,
    element: withRouteSuspense(<TrainerLeadsScreen />),
  },
  {
    path: '/trainer/crm',
    label: 'CRM',
    icon: ClipboardDocumentListIcon,
    element: withRouteSuspense(<TrainerCrmScreen />),
    toolbarPosition: 'left',
  },
  {
    path: '/trainer/templates',
    label: 'Шаблоны',
    icon: RectangleStackIcon,
    element: withRouteSuspense(<TrainerTemplatesScreen />),
    toolbarPosition: 'right',
  },
  {
    path: '/trainer/calendar',
    label: 'Календарь',
    icon: CalendarIcon,
    element: withRouteSuspense(<TrainerCalendarScreen />),
    toolbarPosition: 'right',
  },
  {
    path: '/trainer/library',
    label: 'Упражнения',
    icon: BookOpenIcon,
    element: withRouteSuspense(<TrainerExerciseLibraryScreen />),
    toolbarPosition: 'right',
  },
  {
    path: '/profile',
    label: 'Профиль',
    icon: Cog6ToothIcon,
    element: withRouteSuspense(<ProfileScreen />),
    toolbarPosition: 'right',
  },
];

/** All routes combined (for App.tsx route definitions) */
export const routes: RouteItem[] = [...athleteRoutes, ...trainerRoutes];
