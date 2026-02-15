import './styles.css';
import { NavLink, useNavigate } from 'react-router';
import { routes, RouteItem } from '@/constants/routes';

export default function Navigation() {
  const navigate = useNavigate();

  const leftItems = routes.filter((r) => r.toolbarPosition === 'left');
  const rightItems = routes.filter((r) => r.toolbarPosition === 'right');
  const centerItem = routes.find((r) => r.toolbarPosition === 'center');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md nav-background">
      <div className="max-w-md mx-auto px-6 h-20">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center h-full">
          <div className="flex gap-6 justify-start items-center">
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

          <div className="flex gap-6 justify-end items-center">
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
      <span className="text-[10px] font-medium leading-tight mt-1">{route.label}</span>
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
      <route.icon className="w-9 h-9" strokeWidth={2.5} />
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
        className={route.accent ? 'w-7 h-7' : 'w-6 h-6'}
        strokeWidth={route.accent ? 2.5 : 2}
      />
      {!route.accent && (
        <span className="text-[10px] font-medium leading-tight mt-1">{route.label}</span>
      )}
    </button>
  );
}
