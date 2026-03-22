import { useEffect } from 'react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalOverlayProps {
  open: boolean;
  children: React.ReactNode;
  variant?: 'form' | 'fullscreen';
  onClose?: () => void;
}

export default function ModalOverlay({
  open,
  children,
  variant = 'form',
  onClose,
}: ModalOverlayProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEscapeKey(onClose ?? (() => {}), open && !!onClose);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`modal-overlay fixed inset-0 z-50 bg-black/70 ${
            variant === 'form' ? 'overflow-y-auto overscroll-contain backdrop-blur-sm' : 'overflow-hidden'
          }`}
          onClick={variant === 'fullscreen' ? onClose : undefined}
        >
          {variant === 'fullscreen' ? (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-fullscreen-panel absolute max-w-[798px] w-[calc(100%-2rem)] left-1/2 -translate-x-1/2 top-4 bottom-24 rounded-2xl border border-(--color_border) flex flex-col overflow-hidden backdrop-blur-md"
            >
              {children}
            </motion.div>
          ) : (
            <div className="min-h-full p-4 pb-24 flex flex-col">
              <div className="w-full max-w-2xl mx-auto mt-safe">{children}</div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
