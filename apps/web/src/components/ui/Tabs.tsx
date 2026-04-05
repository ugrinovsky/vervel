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
  /** 'default' (default) — pill/background style; 'underline' — animated bottom border */
  variant?: 'default' | 'underline';
  /**
   * Только сегменты без рамки/фона — родитель рисует карточку (напр. AnalyticsPeriodToggle).
   */
  embedded?: boolean;
  /** role="tablist" + aria-label для встроенного режима */
  ariaLabel?: string;
}

export default function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  className = '',
  size = 'md',
  variant = 'default',
  embedded = false,
  ariaLabel,
}: Props<T>) {
  const layoutId = useId();
  const isCompact = size === 'sm';

  if (variant === 'underline') {
    return (
      <div className={`flex ${className}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative flex-1 flex items-center justify-center py-2.5 text-sm font-medium transition-colors outline-none ${active === tab.id ? 'text-white' : 'text-(--color_text_muted) hover:text-white'}`}
          >
            <span className="relative z-10">{tab.label}</span>
            {active === tab.id && (
              <motion.div
                layoutId={`${layoutId}-tab-underline`}
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--color_primary_light)"
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              />
            )}
          </button>
        ))}
      </div>
    );
  }

  const outerClass = embedded
    ? `flex w-full gap-1 p-1 ${className}`
    : isCompact
      ? `flex items-center rounded-lg bg-(--color_bg_card) border border-(--color_border) overflow-hidden ${className}`
      : `flex gap-1 bg-(--color_bg_card) rounded-2xl p-1 border border-(--color_border) ${className}`;

  const btnClass = (isActive: boolean) => {
    if (isCompact) {
      return `relative flex-1 flex items-center justify-center px-2 py-1.5 text-xs font-medium transition-colors outline-none ${isActive ? '' : 'text-(--color_text_muted) hover:text-white'}`;
    }
    const embeddedExtra = embedded
      ? 'min-h-[44px] font-semibold tracking-tight focus-visible:ring-2 focus-visible:ring-(--color_primary_light) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color_bg_card) '
      : '';
    return `relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors outline-none ${embeddedExtra}${isActive ? '' : 'text-(--color_text_muted) hover:text-white'}`;
  };

  return (
    <motion.div
      role={ariaLabel ? 'tablist' : undefined}
      aria-label={ariaLabel}
      initial={embedded ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={outerClass}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role={ariaLabel ? 'tab' : undefined}
          aria-selected={ariaLabel ? active === tab.id : undefined}
          onClick={() => onChange(tab.id)}
          style={active === tab.id ? { color: 'white' } : undefined}
          className={btnClass(active === tab.id)}
        >
          {active === tab.id && (
            <motion.span
              layoutId={layoutId}
              className={
                isCompact
                  ? 'absolute inset-0 bg-(--color_primary_light)'
                  : embedded
                    ? 'absolute inset-0 rounded-xl bg-(--color_primary_light) shadow-lg ring-1 ring-white/15'
                    : 'absolute inset-0 rounded-xl bg-(--color_primary_light) shadow-sm'
              }
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            />
          )}
          <span className={`relative z-10 ${embedded ? 'px-0.5' : ''}`}>{tab.label}</span>
        </button>
      ))}
    </motion.div>
  );
}
