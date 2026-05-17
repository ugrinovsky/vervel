import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { buttonClasses, type ButtonSize, type ButtonVariant } from '@/components/ui/buttonStyles';

export type { ButtonSize, ButtonVariant };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Full width (default true for primary/soft/ghost at md; false for sm/xs). */
  fullWidth?: boolean;
  loading?: boolean;
  loadingText?: string;
  /** For variant="list-row" — highlighted row in picker lists. */
  selected?: boolean;
}

const FULL_WIDTH_DEFAULT: Partial<Record<ButtonVariant, boolean>> = {
  primary: true,
  soft: true,
  ghost: true,
  secondary: true,
};

/**
 * Unified button — prefer this over raw `<button>` with inline Tailwind.
 * Specialized: PillButton, IconButton, ListButton, CloseButton, ConfirmDeleteButton.
 * Animated: MotionButton (framer-motion wrapper).
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    fullWidth,
    loading,
    loadingText,
    selected,
    disabled,
    className = '',
    type = 'button',
    style,
    ...props
  },
  ref,
) {
  const resolvedFullWidth = fullWidth ?? FULL_WIDTH_DEFAULT[variant] ?? false;
  const isPrimary = variant === 'primary';

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      style={isPrimary ? { color: 'white', ...style } : style}
      className={buttonClasses({
        variant,
        size,
        fullWidth: resolvedFullWidth,
        selected,
        className,
      })}
      {...props}
    >
      {loading && loadingText ? loadingText : children}
    </button>
  );
});

Button.displayName = 'Button';

export const MotionButton = motion.create(Button);

export default Button;
