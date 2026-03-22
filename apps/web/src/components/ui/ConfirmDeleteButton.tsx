import { useState, useEffect, useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const CONFIRM_EVENT = 'confirm-delete:open';
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
  const id = useId();
  const [confirming, setConfirming] = useState(false);

  // Reset when another confirm button opens
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail !== id) setConfirming(false);
    };
    window.addEventListener(CONFIRM_EVENT, handler);
    return () => window.removeEventListener(CONFIRM_EVENT, handler);
  }, [id]);

  const startConfirming = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirming(true);
    window.dispatchEvent(new CustomEvent(CONFIRM_EVENT, { detail: id }));
  };

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
        onClick={startConfirming}
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
        onClick={startConfirming}
        className={`text-(--color_text_muted) hover:text-red-400 transition-colors p-1 ${className}`}
      >
        {icon === 'trash' ? <TrashIcon className="w-4 h-4" /> : <XMarkIcon className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`absolute inset-0 ${overlayRounded} bg-black/30 backdrop-blur-sm z-10 border border-red-500/50 flex items-center justify-center gap-2 ${
              overlayLayout === 'column' ? 'flex-col' : ''
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className={`text-[white] font-medium ${overlayLayout === 'column' ? 'text-xs' : 'text-sm'}`}>
              {label}
            </span>
            <div className="flex gap-2">
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                onClick={() => { onConfirm(); setConfirming(false); }}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/80 hover:bg-red-500 text-[white] transition-colors"
              >
                Да
              </motion.button>
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                onClick={() => setConfirming(false)}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-[white] transition-colors"
              >
                Нет
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
