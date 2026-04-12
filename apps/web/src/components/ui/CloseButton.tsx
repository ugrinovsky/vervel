import { XMarkIcon } from '@heroicons/react/24/outline';

interface CloseButtonProps {
  onClick: () => void;
  className?: string;
  iconClassName?: string;
  'aria-label'?: string;
}

export default function CloseButton({
  onClick,
  className = '',
  iconClassName = 'w-4 h-4',
  'aria-label': ariaLabel = 'Закрыть',
}: CloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`w-8 h-8 flex items-center justify-center rounded-xl border border-(--color_border) bg-(--color_bg_input) text-(--color_text_muted) hover:bg-(--color_bg_card_hover) hover:text-(--color_text_secondary) hover:border-(--color_primary_icon)/35 active:scale-[0.98] transition-all shrink-0 ${className}`}
    >
      <XMarkIcon className={iconClassName} />
    </button>
  );
}
