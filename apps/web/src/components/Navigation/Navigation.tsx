import './styles.css';
import { NavLink, useNavigate } from 'react-router';
import { athleteRoutes, trainerRoutes, RouteItem } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';

export default function Navigation() {
  const navigate = useNavigate();
  const { isTrainer, isAthlete, activeMode } = useAuth();

  // When role is 'both', use activeMode to decide which nav to show
  const showTrainerNav = isTrainer && (!isAthlete || activeMode === 'trainer');

  // Trainer gets a completely different nav
  if (showTrainerNav) {
    const navItems = trainerRoutes.filter((r) => r.toolbarPosition);
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md nav-background">
        <div className="max-w-md mx-auto px-3 h-16">
          <div className="flex items-center justify-around h-full">
            {navItems.map((route) => (
              <NavItem key={route.path} route={route} />
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md nav-background">
      <div className="max-w-md mx-auto px-3 h-16">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center h-full">
          <div className="flex justify-around items-center">
            {leftItems.map((route) =>
              route.isButton ? (
                <ActionButton key={route.path} route={route} navigate={navigate} />
              ) : (
                <NavItem key={route.path} route={route} />
              )
            )}
          </div>

          <div className="flex justify-center items-center">
            {centerItem && <ActionButtonCenter route={centerItem} navigate={navigate} />}
          </div>

          <div className="flex justify-around items-center">
            {rightItems.map((route) =>
              route.isButton ? (
                <ActionButton key={route.path} route={route} navigate={navigate} />
              ) : (
                <NavItem key={route.path} route={route} />
              )
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavItem({ route }: { route: RouteItem }) {
  return (
    <NavLink
      to={route.path}
      className={({ isActive }) => (isActive ? 'nav-item-active' : 'nav-item-inactive')}
    >
      <route.icon className="w-6 h-6" strokeWidth={2} />
    </NavLink>
  );
}

function ActionButtonCenter({
  route,
  navigate,
}: {
  route: RouteItem;
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <button onClick={() => navigate(route.path)} className="nav-button-center main-button">
      <route.icon className="w-7 h-7" strokeWidth={2.5} />
    </button>
  );
}

function ActionButton({
  route,
  navigate,
}: {
  route: RouteItem;
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <button
      onClick={() => navigate(route.path)}
      className={route.accent ? 'nav-item-accent' : 'nav-item-inactive'}
    >
      <route.icon
        className={route.accent ? 'w-6 h-6' : 'w-6 h-6'}
        strokeWidth={route.accent ? 2.5 : 2}
      />
    </button>
  );
}
