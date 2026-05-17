import { forwardRef, type InputHTMLAttributes } from 'react';
import { fieldControlClasses, INPUT_FIELD_PADDING } from '@/components/ui/inputStyles';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Только нативный input — для встраивания в relative/flex (чат, пароль с иконкой). */
  bare?: boolean;
}

/**
 * Unified text field — prefer this over raw `<input>` with inline Tailwind.
 * Specialized: SearchInput, NumberInput, PhoneInput, DatePickerField, TimeInput.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, bare = false, className = '', style, ...props },
  ref,
) {
  const control = (
    <input
      ref={ref}
      {...props}
      className={
        bare
          ? [error ? 'border-red-500/60' : '', className].filter(Boolean).join(' ').trim()
          : fieldControlClasses({ error, className: `${INPUT_FIELD_PADDING} ${className}` })
      }
      style={{ outline: 'none', ...style }}
    />
  );

  if (bare) {
    return (
      <>
        {control}
        {error ? <p className="text-xs text-red-400 mt-1">{error}</p> : null}
      </>
    );
  }

  return (
    <div className="w-full">
      {label ? <label className="block text-xs text-(--color_text_muted) mb-1">{label}</label> : null}
      {control}
      {error ? <p className="text-xs text-red-400 mt-1">{error}</p> : null}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
