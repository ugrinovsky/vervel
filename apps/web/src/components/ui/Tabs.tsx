import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useId } from 'react';

interface Tab<T extends string> {
  id: T;
  label: ReactNode;
}

interface Props<T extends string> {
  tabs: Tab<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
  /** 'md' (default) — with outer padding and gap; 'sm' — seamless compact icon toggle */
  size?: 'md' | 'sm';
}

export default function Tabs<T extends string>({ tabs, active, onChange, className = '', size = 'md' }: Props<T>) {
  const layoutId = useId();
  const isCompact = size === 'sm';

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={
        isCompact
          ? `flex items-center rounded-lg bg-(--color_bg_card) border border-(--color_border) overflow-hidden ${className}`
          : `flex gap-1 bg-(--color_bg_card) rounded-2xl p-1 border border-(--color_border) ${className}`
      }
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={active === tab.id ? { color: 'white' } : undefined}
          className={
            isCompact
              ? `relative flex-1 flex items-center justify-center px-2 py-1.5 text-xs font-medium transition-colors outline-none ${active === tab.id ? '' : 'text-(--color_text_muted) hover:text-white'}`
              : `relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors outline-none ${active === tab.id ? '' : 'text-(--color_text_muted) hover:text-white'}`
          }
        >
          {active === tab.id && (
            <motion.span
              layoutId={layoutId}
              className={isCompact ? 'absolute inset-0 bg-(--color_primary_light)' : 'absolute inset-0 rounded-xl bg-(--color_primary_light) shadow-sm'}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            />
          )}
          <span className="relative z-10">{tab.label}</span>
        </button>
      ))}
    </motion.div>
  );
}
