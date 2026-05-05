import type { ButtonHTMLAttributes, MouseEvent } from 'react';

export type SwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'role'> & {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** md — как в настройках функций; sm — компактный (онбординг) */
  size?: 'md' | 'sm';
};

/**
 * Базовый переключатель (тумблер) для булевых настроек. Доступность: role="switch", aria-checked.
 */
export default function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  size = 'md',
  className = '',
  onClick,
  ...rest
}: SwitchProps) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (disabled || e.defaultPrevented) return;
    onCheckedChange?.(!checked);
  };

  const track =
    size === 'md'
      ? 'w-11 h-6'
      : 'w-10 h-5';

  const thumb =
    size === 'md'
      ? 'top-1 left-1 ' + (checked ? 'translate-x-5' : 'translate-x-0')
      : 'top-0.5 left-0.5 ' + (checked ? 'translate-x-[18px]' : 'translate-x-0');

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      className={`shrink-0 rounded-full transition-colors relative disabled:opacity-50 disabled:cursor-not-allowed ${track} ${
        checked ? 'bg-emerald-500' : 'bg-white/10'
      } ${className}`.trim()}
      {...rest}
    >
      <span
        className={`absolute w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ease-out pointer-events-none ${thumb}`}
      />
    </button>
  );
}
