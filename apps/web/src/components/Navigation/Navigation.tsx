import './styles.css';
import { NavLink, useNavigate, useLocation } from 'react-router';
import { athleteRoutes, trainerRoutes, RouteItem } from '@/constants/routes';
import { useActiveMode } from '@/contexts/AuthContext';
import Badge from '@/components/ui/Badge';
import { useDialogs } from '@/hooks/useDialogs';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

export default function Navigation() {
  const navigate = useNavigate();
  const { isTrainer, isAthlete, activeMode } = useActiveMode();
  const flags = useFeatureFlags();
  const showTrainerNav = isTrainer && (!isAthlete || activeMode === 'trainer');

  const { data: dialogs } = useDialogs(5_000);
  const totalUnread = dialogs?.reduce((s, d) => s + d.unreadCount, 0) ?? 0;

  const getUnread = (path: string) => {
    if (path === '/dialogs') return totalUnread;
    return 0;
  };

  // Trainer nav
  if (showTrainerNav) {
    const navItems = trainerRoutes
      .filter((r) => r.toolbarPosition)
      .filter((r) => {
        if (r.path === '/dialogs') return flags.dialogs;
        if (r.path === '/trainer/templates') return flags.trainerTemplates;
        if (r.path === '/trainer/library') return flags.trainerLibrary;
        if (r.path === '/trainer/team') return flags.teams;
        return true;
      });
    return (
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md nav-background"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="max-w-md mx-auto px-3 h-16">
          <div className="flex items-center justify-around h-full">
            {navItems.map((route) => (
              <NavItem key={route.path} route={route} unread={getUnread(route.path)} />
            ))}
          </div>
        </div>
      </nav>
    );
  }

  // Athlete navigation (with center button)
  const allLeft = athleteRoutes.filter((r) => r.toolbarPosition === 'left');
  const allRight = athleteRoutes.filter((r) => r.toolbarPosition === 'right');
  const centerItem = athleteRoutes.find((r) => r.toolbarPosition === 'center');

  // Filter by feature flags
  const leftItems = allLeft.filter((r) => {
    if (r.path === '/dialogs') return flags.dialogs;
    if (r.path === '/analytics') return flags.analytics;
    return true;
  });
  const rightItems = allRight.filter((r) => {
    if (r.path === '/my-team') return flags.teams;
    return true;
  });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md nav-background"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-md mx-auto px-3 h-16">
        {flags.avatar && centerItem ? (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center h-full gap-x-2 sm:gap-x-3">
            {/* Иконки прижаты к центральному аватару, а не размазаны по половине ширины */}
            <div className="flex justify-end items-center min-w-0 gap-1.5 sm:gap-2 pr-0.5">
              {leftItems.map((route) =>
                route.isButton ? (
                  <ActionButton key={route.path} route={route} navigate={navigate} />
                ) : (
                  <NavItem key={route.path} route={route} unread={getUnread(route.path)} />
                )
              )}
            </div>
            <div className="flex justify-center items-center shrink-0">
              <ActionButtonCenter route={centerItem} />
            </div>
            <div className="flex justify-start items-center min-w-0 gap-1.5 sm:gap-2 pl-0.5">
              {rightItems.map((route) =>
                route.isButton ? (
                  <ActionButton key={route.path} route={route} navigate={navigate} />
                ) : (
                  <NavItem key={route.path} route={route} unread={getUnread(route.path)} />
                )
              )}
            </div>
          </div>
        ) : (
          <div className="flex justify-around items-center h-full">
            {[...leftItems, ...rightItems].map((route) =>
              route.isButton ? (
                <ActionButton key={route.path} route={route} navigate={navigate} />
              ) : (
                <NavItem key={route.path} route={route} unread={getUnread(route.path)} />
              )
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

function NavItem({ route, unread = 0 }: { route: RouteItem; unread?: number }) {
  return (
    <NavLink
      to={route.path}
      end
      className={({ isActive }) => (isActive ? 'nav-item-active' : 'nav-item-inactive')}
    >
      <div className="relative">
        <route.icon className="w-6 h-6" strokeWidth={2} />
        {unread > 0 && <Badge count={unread} size="xs" className="absolute -top-1.5 -right-1.5" />}
      </div>
    </NavLink>
  );
}

function ActionButtonCenter({ route }: { route: RouteItem }) {
  return (
    <NavLink to={route.path} end className="nav-button-center outline-none">
      <route.icon className="w-7 h-7" strokeWidth={2.5} />
    </NavLink>
  );
}

function ActionButton({
  route,
  navigate,
}: {
  route: RouteItem;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const location = useLocation();
  const isActive = location.pathname === route.path;
  return (
    <button
      onClick={() => navigate(route.path)}
      className={
        route.accent
          ? isActive
            ? 'nav-item-accent-active'
            : 'nav-item-accent'
          : isActive
            ? 'nav-item-active'
            : 'nav-item-inactive'
      }
    >
      <route.icon className="w-6 h-6" strokeWidth={route.accent ? 2.5 : 2} />
    </button>
  );
}
