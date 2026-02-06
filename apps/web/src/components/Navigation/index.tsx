import './styles.css';
import { NavLink, useNavigate } from 'react-router';
import { routes, RouteItem } from '@/constants/routes';

export default function Navigation() {
  const navigate = useNavigate();

  // Разделяем кнопки по позициям
  const leftItems = routes.filter((r) => r.toolbarPosition === 'left');
  const rightItems = routes.filter((r) => r.toolbarPosition === 'right');
  const centerItem = routes.find((r) => r.toolbarPosition === 'center');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/5 backdrop-blur-sm px-4 py-3">
      <ul className="flex items-center justify-around relative">
        {/* Левая группа */}
        <div className="flex gap-10">
          {leftItems.map((route) =>
            route.isButton ? (
              <ActionButton key={route.path} route={route} navigate={navigate} />
            ) : (
              <NavItem key={route.path} route={route} />
            )
          )}
        </div>

        {/* Центральная кнопка */}
        {centerItem && (
          <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <ActionButtonCenter route={centerItem} navigate={navigate} />
          </div>
        )}

        {/* Правая группа */}
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

// Центральная акцентная кнопка
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
        w-16 h-16 rounded-full
        bg-emerald-500 text-black
        flex items-center justify-center
        shadow-xl active:scale-95 transition
      "
    >
      <route.icon className="w-8 h-8" />
    </button>
  );
}

// Остальные кнопки
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
