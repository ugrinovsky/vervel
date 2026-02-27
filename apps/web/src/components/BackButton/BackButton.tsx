import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export default function BackButton({ onClick, label = 'Назад', className = '' }: BackButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-2 mb-5 ${className}`}
    >
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10 group-hover:border-white/20 transition-all duration-200">
        <ArrowLeftIcon className="w-4 h-4 text-white/60 group-hover:text-white transition-colors duration-200" />
      </span>
      <span className="text-sm text-white/50 group-hover:text-white/80 transition-colors duration-200">
        {label}
      </span>
    </button>
  );
}
