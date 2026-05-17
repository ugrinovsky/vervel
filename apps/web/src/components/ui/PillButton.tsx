import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Button from '@/components/ui/Button';
import { pillColors } from '@/components/ui/buttonStyles';

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
  /**
   * 'pill' (default) — transparent inactive, primary_light active (tiny nav chips)
   * 'tab' — card bg inactive, primary_light active (screen-level tabs)
   */
  variant?: 'pill' | 'tab';
  /**
   * 'sm' (default) — compact chip: text-[11px] px-2 py-0.5 rounded-md
   * 'md' — full tab: text-sm px-4 py-2 rounded-xl
   */
  size?: 'sm' | 'md';
}

export default function PillButton({
  active = false,
  variant = 'pill',
  size = 'sm',
  className = '',
  children,
  type = 'button',
  ...props
}: PillButtonProps) {
  const base =
    size === 'md'
      ? 'inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors'
      : 'inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all leading-[1.4]';

  return (
    <Button
      type={type}
      variant="unstyled"
      className={`${base} ${pillColors(variant, active)} ${className}`}
      {...props}
    >
      {children}
    </Button>
  );
}
