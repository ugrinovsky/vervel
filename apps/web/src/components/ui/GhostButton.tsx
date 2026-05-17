import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import Button, { type ButtonVariant } from '@/components/ui/Button';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /**
   * dashed — full-width dashed border (default)
   * solid — bordered pill with card hover bg
   * outline-accent — compact border, accent text (каталог, вторичные CTA)
   * accent-soft — full-width мягкий акцент (создать эталон, закрепить топ)
   * link — текстовая ссылка без рамки
   */
  variant?: 'dashed' | 'solid' | 'outline-accent' | 'accent-soft' | 'link';
}

const VARIANT_MAP: Record<NonNullable<Props['variant']>, ButtonVariant> = {
  dashed: 'ghost',
  solid: 'outline',
  'outline-accent': 'outline-accent',
  'accent-soft': 'soft',
  link: 'link',
};

/**
 * @deprecated Prefer `<Button variant="ghost|outline|soft|link" />`.
 */
export default function GhostButton({
  children,
  variant = 'dashed',
  className = '',
  type = 'button',
  ...props
}: Props) {
  const mapped = VARIANT_MAP[variant];
  const fullWidth = variant === 'dashed' || variant === 'accent-soft';

  return (
    <Button
      type={type}
      variant={mapped}
      size={variant === 'outline-accent' ? 'sm' : 'md'}
      fullWidth={fullWidth}
      className={
        variant === 'accent-soft'
          ? `py-2.5 ${className}`
          : variant === 'dashed'
            ? `py-2 ${className}`
            : className
      }
      {...props}
    >
      {children}
    </Button>
  );
}
