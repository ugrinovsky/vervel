import { type ReactNode, useId } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';

interface Tab<T extends string> {
  id: T;
  label: ReactNode;
}

interface TabCardProps<T extends string> {
  tabs: Tab<T>[];
  active: T;
  onChange: (id: T) => void;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export default function TabCard<T extends string>({
  tabs,
  active,
  onChange,
  children,
  className = '',
  bodyClassName = '',
}: TabCardProps<T>) {
  const layoutId = useId();

  return (
    <div
      className={`glass rounded-xl overflow-hidden ${className}`}
    >
      <div className="flex border-b border-(--color_border) bg-(--color_bg_card)">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            variant="unstyled"
            onClick={() => onChange(tab.id)}
            className="relative flex-1 flex items-center justify-center px-2 py-2 text-sm font-medium transition-colors outline-none"
            style={active === tab.id ? { color: 'white' } : undefined}
          >
            {active === tab.id && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 bg-(--color_primary_light)"
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              />
            )}
            <span
              className={`relative z-10 ${active === tab.id ? '' : 'text-(--color_text_muted)'}`}
            >
              {tab.label}
            </span>
          </Button>
        ))}
      </div>
      <div className={`bg-(--color_bg_card_hover) ${bodyClassName}`}>{children}</div>
    </div>
  );
}
