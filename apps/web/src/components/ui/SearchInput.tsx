import { InputHTMLAttributes } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {}

export default function SearchInput({ className = '', ...props }: SearchInputProps) {
  return (
    <div className={`flex items-center gap-2 bg-(--color_bg_card) rounded-xl px-3 py-2 border border-(--color_border)/50 focus-within:border-(--color_primary_light)/60 transition-colors ${className}`}>
      <MagnifyingGlassIcon className="w-4 h-4 text-(--color_text_muted) shrink-0" />
      <input
        type="text"
        {...props}
        className="flex-1 bg-transparent text-[14px] text-white placeholder:text-(--color_text_muted) border-none focus:outline-none"
        style={{ outline: 'none' }}
      />
    </div>
  );
}
