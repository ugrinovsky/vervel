import { useState } from 'react';
import { TrashIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

interface Props {
  onConfirm: () => void;
  /** Icon to show in idle state. Default: TrashIcon */
  icon?: 'trash' | 'x';
  /**
   * inline  — confirmation buttons replace the delete button in-place (default)
   * overlay — backdrop overlay covers the entire parent element (parent must be `relative`)
   */
  variant?: 'inline' | 'overlay';
  /** Text shown in the confirmation state. Default: 'Удалить?' */
  label?: string;
  /** Border-radius applied to the overlay. Default: 'rounded-xl' */
  overlayRounded?: string;
  /** Row layout (default) or column layout for the overlay confirmation. Default: 'row' */
  overlayLayout?: 'row' | 'column';
  className?: string;
}

export default function ConfirmDeleteButton({
  onConfirm,
  icon = 'trash',
  variant = 'inline',
  label = 'Удалить?',
  overlayRounded = 'rounded-xl',
  overlayLayout = 'row',
  className = '',
}: Props) {
  const [confirming, setConfirming] = useState(false);

  /* ── inline variant ── */
  if (variant === 'inline') {
    if (confirming) {
      return (
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-red-400 mr-1 select-none">{label}</span>
          <button
            type="button"
            onClick={() => { onConfirm(); setConfirming(false); }}
            className="p-1 text-red-400 hover:text-red-300 transition-colors"
            title="Да"
          >
            <CheckIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="p-1 text-white/40 hover:text-white transition-colors"
            title="Отмена"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
        className={`text-white/30 hover:text-red-400 transition-colors ${className}`}
      >
        {icon === 'trash' ? <TrashIcon className="w-4 h-4" /> : <XMarkIcon className="w-4 h-4" />}
      </button>
    );
  }

  /* ── overlay variant ── */
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
        className={`text-(--color_text_muted) hover:text-red-400 transition-colors p-1 ${className}`}
      >
        {icon === 'trash' ? <TrashIcon className="w-4 h-4" /> : <XMarkIcon className="w-4 h-4" />}
      </button>

      {confirming && (
        <div
          className={`absolute inset-0 ${overlayRounded} bg-black/45 backdrop-blur-sm z-10 flex items-center justify-center gap-3 ${
            overlayLayout === 'column' ? 'flex-col gap-2' : ''
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <span className={`text-red-400 font-medium ${overlayLayout === 'column' ? 'text-xs' : 'text-sm'}`}>
            {label}
          </span>
          {overlayLayout === 'column' ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { onConfirm(); setConfirming(false); }}
                className="p-1.5 text-red-400 hover:text-red-300 transition-colors"
                title="Да"
              >
                <CheckIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="p-1.5 text-white/60 hover:text-white transition-colors"
                title="Отмена"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { onConfirm(); setConfirming(false); }}
                className="p-1.5 text-red-400 hover:text-red-300 transition-colors"
                title="Да"
              >
                <CheckIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="p-1.5 text-white/60 hover:text-white transition-colors"
                title="Отмена"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
