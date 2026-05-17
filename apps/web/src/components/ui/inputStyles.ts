/** Shared field class maps — single source of truth for Input / Textarea. */

export function fieldControlClasses({
  error,
  className = '',
}: {
  error?: string;
  className?: string;
}): string {
  const base =
    'w-full bg-(--color_bg_input) border border-(--color_border) text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors placeholder:text-(--color_text_muted)';
  const errorCls = error ? 'border-red-500/60 focus:border-red-400' : '';
  return [base, errorCls, className].filter(Boolean).join(' ').trim();
}

export const INPUT_FIELD_PADDING = 'px-4 py-3 rounded-xl';
export const TEXTAREA_FIELD_PADDING = 'px-3 py-2.5 rounded-xl resize-none leading-relaxed';

/** Date/time pickers — h-10, место под иконку справа. */
export const PICKER_FIELD_PADDING = 'h-10 min-w-0 px-3 pr-10 rounded-xl text-sm';

/** Скрыть нативную иконку; кликабельная зона справа для открытия пикера. */
export const NATIVE_DATETIME_PICKER_HIDE =
  'appearance-none [&::-webkit-calendar-picker-indicator]:!opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-y-0 [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:cursor-pointer';

export function pickerFieldClasses({
  error,
  className = '',
  hideNativePicker = false,
}: {
  error?: string;
  className?: string;
  hideNativePicker?: boolean;
} = {}): string {
  const hide = hideNativePicker ? NATIVE_DATETIME_PICKER_HIDE : '';
  return fieldControlClasses({ error, className: `${PICKER_FIELD_PADDING} ${hide} ${className}` })
    .replace(/\s+/g, ' ')
    .trim();
}
