import { useNavigate } from 'react-router';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

export interface ScreenLink {
  emoji: string;
  bg: string;
  label: string;
  sub: string;
  to: string;
}

interface ScreenLinksProps {
  links: ScreenLink[];
  className?: string;
}

export default function ScreenLinks({ links, className = '' }: ScreenLinksProps) {
  const navigate = useNavigate();

  return (
    <div className={`border-t border-(--color_border) pt-3 ${className}`}>
      {links.map(({ emoji, bg, label, sub, to }) => (
        <button
          key={to}
          onClick={() => navigate(to)}
          className="w-full flex items-center justify-between px-2 py-2.5 rounded-lg hover:bg-(--color_bg_card) transition-colors text-left group"
        >
          <div className="flex items-center gap-2.5">
            <span className={`w-7 h-7 shrink-0 rounded-lg ${bg} flex items-center justify-center text-sm`}>
              {emoji}
            </span>
            <div>
              <div className="text-sm font-medium text-white">{label}</div>
              <div className="text-xs text-(--color_text_muted)">{sub}</div>
            </div>
          </div>
          <ChevronRightIcon className="w-4 h-4 text-(--color_text_muted) group-hover:text-white transition-colors shrink-0" />
        </button>
      ))}
    </div>
  );
}
