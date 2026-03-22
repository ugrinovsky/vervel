import { motion } from 'framer-motion';
import { useId } from 'react';

interface Tab<T extends string> {
  id: T;
  label: string;
}

interface Props<T extends string> {
  tabs: Tab<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}

export default function Tabs<T extends string>({ tabs, active, onChange, className = '' }: Props<T>) {
  const layoutId = useId();

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-1 bg-(--color_bg_card) rounded-2xl p-1 border border-(--color_border) ${className}`}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors outline-none ${
            active === tab.id ? 'text-white' : 'text-(--color_text_muted) hover:text-white'
          }`}
        >
          {active === tab.id && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 rounded-xl bg-(--color_primary_light) shadow-sm"
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            />
          )}
          <span className="relative z-10">{tab.label}</span>
        </button>
      ))}
    </motion.div>
  );
}
