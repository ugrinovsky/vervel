import { forwardRef, type ReactNode } from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { noPullRefreshProps } from '@/lib/noPullRefresh';
import Button from '@/components/ui/Button';

type Props = Omit<React.ComponentPropsWithoutRef<'button'>, 'children' | 'type'> & {
  children?: ReactNode;
};

/** Ручка reorder для @dnd-kit sortable + игнор pull-to-refresh на мобилке */
export const SortableDragHandle = forwardRef<HTMLButtonElement, Props>(
  function SortableDragHandle(
    { className = '', children, title = 'Перетащить', ...rest },
    ref,
  ) {
    return (
      <Button
        ref={ref}
        type="button"
        variant="unstyled"
        {...noPullRefreshProps}
        title={title}
        className={`shrink-0 p-0.5 rounded text-white/35 hover:text-white/60 cursor-grab active:cursor-grabbing touch-none select-none ${className}`.trim()}
        {...rest}
      >
        {children ?? <Bars3Icon className="w-4 h-4" />}
      </Button>
    );
  },
);
