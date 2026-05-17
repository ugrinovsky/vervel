import type { ReactNode } from 'react';

export default function ChipCountBadge({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] rounded-full px-1.5 py-0.5 bg-black/10 transition-colors duration-200 ease-in-out group-aria-pressed/chip:bg-white/20">
      {children}
    </span>
  );
}
