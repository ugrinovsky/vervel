import { Link, type LinkProps } from 'react-router';
import { buttonClasses, type ButtonSize, type ButtonVariant } from '@/components/ui/buttonStyles';

export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const FULL_WIDTH_DEFAULT: Partial<Record<ButtonVariant, boolean>> = {
  primary: true,
  soft: true,
  ghost: true,
  secondary: true,
};

/** Router Link styled as Button — for navigation CTAs. */
export default function ButtonLink({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className = '',
  style,
  ...props
}: ButtonLinkProps) {
  const resolvedFullWidth = fullWidth ?? FULL_WIDTH_DEFAULT[variant] ?? false;
  const isPrimary = variant === 'primary';

  return (
    <Link
      className={buttonClasses({
        variant,
        size,
        fullWidth: resolvedFullWidth,
        className: `${isPrimary ? 'text-center' : ''} ${className}`.trim(),
      })}
      style={isPrimary ? { color: 'white', ...style } : style}
      {...props}
    />
  );
}
