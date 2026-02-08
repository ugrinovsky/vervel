import './styles.css';
import { NavLink, useNavigate } from 'react-router';
import { routes, RouteItem } from '@/constants/routes';

export default function Navigation() {
  const navigate = useNavigate();

  // Разделяем нопки по позициям
  const leftItems = routes.filter((r) => r.toolbarPosition === 'left');
  const rightItems = routes.filter((r) => r.toolbarPosition === 'right');
  const centerItem = routes.find((r) => r.toolbarPosition === 'center');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/5 backdrop-blur-sm px-4 h-20">
      <ul className="flex items-center justify-around relative">
        <div className="flex gap-5">
          {leftItems.map((route) =>
            route.isButton ? (
              <ActionButton key={route.path} route={route} navigate={navigate} />
            ) : (
              <NavItem key={route.path} route={route} />
            )
          )}
        </div>

        {centerItem && (
          <div className="-top-10 relative">
            <ActionButtonCenter route={centerItem} navigate={navigate} />
          </div>
        )}

        <div className="flex gap-10">
          {rightItems.map((route) =>
            route.isButton ? (
              <ActionButton key={route.path} route={route} navigate={navigate} />
            ) : (
              <NavItem key={route.path} route={route} />
            )
          )}
        </div>
      </ul>
    </nav>
  );
}

function NavItem({ route }: { route: RouteItem }) {
  return (
    <NavLink
      to={route.path}
      className={({ isActive }) =>
        `flex items-center justify-center transition-colors ${
          isActive ? 'text-white' : 'text-white/50'
        }`
      }
    >
      <route.icon className="w-6 h-6" />
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
    <button
      onClick={() => navigate(route.path)}
      className="
        relative
        w-20 h-20 rounded-full
        bg-emerald-500 text-black
        flex items-center justify-center
        transition active:scale-95
      "
    >
      <span className="absolute inset-0 -z-10 rounded-full bg-emerald-500/60 blur-xl animate-[glow_3s_ease-in-out_infinite]" />

      <route.icon className="w-10 h-10" />
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
      className="
        w-12 h-12 rounded-full
        bg-white/20 text-white
        flex items-center justify-center
        shadow-lg active:scale-95 transition
      "
    >
      <route.icon className="w-6 h-6" />
    </button>
  );
}
