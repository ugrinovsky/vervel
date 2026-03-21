import { InputHTMLAttributes } from 'react';

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {}

const BASE_CLS =
  'min-w-0 w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm text-center outline-none focus:border-white/30 transition-colors placeholder:text-white/20';

export default function NumberInput({ className = '', onClick, ...props }: NumberInputProps) {
  return (
    <input
      type="number"
      onClick={(e) => {
        e.currentTarget.select();
        onClick?.(e);
      }}
      {...props}
      className={`${BASE_CLS} ${className}`}
    />
  );
}
