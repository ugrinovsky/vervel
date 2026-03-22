import { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export default function GhostButton({ children, className = '', ...props }: Props) {
  return (
    <button
      {...props}
      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/20 text-white/60 hover:text-white hover:border-white/40 text-sm transition-colors disabled:opacity-50 disabled:pointer-events-none ${className}`}
    >
      {children}
    </button>
  );
}
