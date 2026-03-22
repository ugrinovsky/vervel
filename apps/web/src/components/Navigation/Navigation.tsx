import './styles.css';
import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router';
import { athleteRoutes, trainerRoutes, RouteItem } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import Badge from '@/components/ui/Badge';
import { athleteApi } from '@/api/athlete';
import { useTrainerUnreadCounts } from '@/hooks/useTrainerUnreadCounts';

export default function Navigation() {
  const navigate = useNavigate();
  const { isTrainer, isAthlete, activeMode } = useAuth();
  const showTrainerNav = isTrainer && (!isAthlete || activeMode === 'trainer');

  const { data: trainerUnread } = useTrainerUnreadCounts(showTrainerNav ? 30_000 : undefined);
  const [athleteUnread, setAthleteUnread] = useState(0);

  useEffect(() => {
    if (showTrainerNav) return;
    const fetch = () =>
      athleteApi
        .getUnreadCounts()
        .then((r: any) => setAthleteUnread(r.data.data.total))
        .catch(() => {});
    fetch();
    const interval = setInterval(fetch, 30_000);
    return () => clearInterval(interval);
  }, [showTrainerNav]);

  const trainerGroupsUnread = trainerUnread?.groups.reduce((s, g) => s + g.unread, 0) ?? 0;
  const trainerAthletesUnread = trainerUnread?.athletes.reduce((s, a) => s + a.unread, 0) ?? 0;

  const getTrainerUnread = (path: string) => {
    if (path === '/trainer/groups') return trainerGroupsUnread;
    if (path === '/trainer/athletes') return trainerAthletesUnread;
    return 0;
  };

  const getAthleteUnread = (path: string) => {
    if (path === '/my-team') return athleteUnread;
    return 0;
  };

  // Trainer nav
  if (showTrainerNav) {
    const navItems = trainerRoutes.filter((r) => r.toolbarPosition);
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md nav-background" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-md mx-auto px-3 h-16">
          <div className="flex items-center justify-around h-full">
            {navItems.map((route) => (
              <NavItem key={route.path} route={route} unread={getTrainerUnread(route.path)} />
            ))}
          </div>
        </div>
      </nav>
    );
  }

  // Athlete navigation (with center button)
  const leftItems = athleteRoutes.filter((r) => r.toolbarPosition === 'left');
  const rightItems = athleteRoutes.filter((r) => r.toolbarPosition === 'right');
  const centerItem = athleteRoutes.find((r) => r.toolbarPosition === 'center');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md nav-background" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="max-w-md mx-auto px-3 h-16">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center h-full gap-x-3">
          <div className="flex justify-around items-center min-w-0">
            {leftItems.map((route) => (
              route.isButton ? (
                <ActionButton key={route.path} route={route} navigate={navigate} />
              ) : (
                <NavItem key={route.path} route={route} unread={getAthleteUnread(route.path)} />
              )
            ))}
          </div>

          <div className="flex justify-center items-center shrink-0">
            {centerItem && <ActionButtonCenter route={centerItem} />}
          </div>

          <div className="flex justify-around items-center min-w-0">
            {rightItems.map((route) => (
              route.isButton ? (
                <ActionButton key={route.path} route={route} navigate={navigate} />
              ) : (
                <NavItem key={route.path} route={route} unread={getAthleteUnread(route.path)} />
              )
            ))}
          </div>
        </div>
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
        {unread > 0 && (
          <Badge count={unread} size="xs" className="absolute -top-1.5 -right-1.5" />
        )}
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
      className={isActive ? 'nav-item-active' : route.accent ? 'nav-item-accent' : 'nav-item-inactive'}
    >
      <route.icon className="w-6 h-6" strokeWidth={route.accent ? 2.5 : 2} />
    </button>
  );
}
