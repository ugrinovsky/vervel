import { InputHTMLAttributes } from 'react';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function TextInput({ label, className = '', ...props }: TextInputProps) {
  return (
    <div className="w-full">
      {label && <label className="block mb-1 text-xs text-white/60">{label}</label>}
      <input
        {...props}
        className={`
          w-full px-3 py-2 rounded-lg
          bg-white/10 border border-white/20
          text-white placeholder-white/40
          focus:outline-none focus:ring-2 focus:ring-emerald-400
          ${className}
        `}
      />
    </div>
  );
}
