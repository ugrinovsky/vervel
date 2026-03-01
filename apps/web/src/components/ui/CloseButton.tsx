import { XMarkIcon } from '@heroicons/react/24/outline';

interface CloseButtonProps {
  onClick: () => void;
  className?: string;
}

export default function CloseButton({ onClick, className = '' }: CloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-8 h-8 flex items-center justify-center rounded-xl bg-white/8 hover:bg-white/15 text-white/50 hover:text-white transition-all shrink-0 ${className}`}
    >
      <XMarkIcon className="w-4 h-4" />
    </button>
  );
}
