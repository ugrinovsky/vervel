import { InputHTMLAttributes } from 'react';

interface AppInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const BASE_CLS =
  'w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors placeholder:text-(--color_text_muted)';

export default function AppInput({ label, error, className = '', ...props }: AppInputProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs text-(--color_text_muted) mb-1">{label}</label>}
      <input
        {...props}
        className={`${BASE_CLS} ${error ? 'border-red-500/60 focus:border-red-400' : ''} ${className}`}
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
