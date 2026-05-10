import { useRef, type InputHTMLAttributes } from 'react';

interface PhoneInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value'
> {
  value: string;
  onChange: (value: string) => void;
}

/** Форматирует строку цифр в +7 (XXX) XXX-XX-XX */
function formatPhone(digits: string): string {
  // всегда начинаем с 7 (для РФ)
  const d = digits.slice(0, 10);
  let result = '+7';
  if (d.length > 0) result += ` (${d.slice(0, 3)}`;
  if (d.length >= 3) result += `)`;
  if (d.length > 3) result += ` ${d.slice(3, 6)}`;
  if (d.length > 6) result += `-${d.slice(6, 8)}`;
  if (d.length > 8) result += `-${d.slice(8, 10)}`;
  return result;
}

/** Извлекает цифры из строки, убирает ведущую 7/8 */
function extractDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('7') || digits.startsWith('8')) return digits.slice(1);
  return digits;
}

const BASE_CLS =
  'w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors placeholder:text-(--color_text_muted)';

export default function PhoneInput({ value, onChange, className = '', ...props }: PhoneInputProps) {
  const ref = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = extractDigits(e.target.value);
    const formatted = digits.length === 0 ? '' : formatPhone(digits);
    onChange(formatted);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Backspace на пустом после +7 — не даём застрять
    if (e.key === 'Backspace' && value === '+7 (') {
      onChange('');
    }
    props.onKeyDown?.(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Если поле пустое — сразу показываем +7
    if (!value) onChange('+7 (');
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Если осталось только начало — очищаем
    if (value === '+7 (' || value === '+7') onChange('');
    props.onBlur?.(e);
  };

  return (
    <input
      {...props}
      ref={ref}
      type="tel"
      inputMode="numeric"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder="+7 (___) ___-__-__"
      className={`${BASE_CLS} ${className}`}
      style={{ outline: 'none', ...props.style }}
    />
  );
}
