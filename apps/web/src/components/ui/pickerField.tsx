import type { ReactNode } from 'react';

type PickerIcon = React.ComponentType<{ className?: string }>;

/** Общая оболочка date/time — иконка справа, единая высота h-10. */
export function PickerFieldShell({
  icon: Icon,
  children,
  className = '',
}: {
  icon: PickerIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative w-full min-w-0 ${className}`}>
      {children}
      <Icon
        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--color_text_muted) shrink-0 pointer-events-none"
        aria-hidden
      />
    </div>
  );
}
