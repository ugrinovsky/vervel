import './styles.css';
import { useState } from 'react';
import { NavLink } from 'react-router';
import { routes } from '@/constants/routes';

export default function Navigation() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full z-50">
      <div className="bg-white/5 backdrop-blur-sm px-4 py-4">
        <ul className="flex justify-around items-center w-full">
          {routes.map((route) => (
            <li key={route.path} className="flex flex-col items-center justify-center">
              <NavLink
                to={route.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    isActive ? 'text-white' : 'text-white/50'
                  }`
                }
              >
                <route.icon className="w-6 h-6 mb-1" />
                {/* <span className="text-xs">{route.label}</span> */}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
