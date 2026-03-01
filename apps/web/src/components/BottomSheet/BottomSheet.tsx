import { type PropsWithChildren, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CloseButton from '@/components/ui/CloseButton';

interface Props extends PropsWithChildren {
  open: boolean;
  onClose: () => void;
  /** Convenience: emoji + text title. Ignored if `header` is provided. */
  title?: string;
  emoji?: string;
  /** Custom header content rendered to the left of the ✕ button. */
  header?: ReactNode;
}

export default function BottomSheet({ open, onClose, title, emoji, header, children }: Props) {
  const headerContent = header ?? (
    <div className="flex items-center gap-2">
      {emoji && <span className="text-2xl">{emoji}</span>}
      <span className="text-lg font-bold text-white">{title}</span>
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60" />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="background relative w-full rounded-t-3xl p-6 pb-24 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--color_bg_card)' }}
          >
            {/* Handle */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/20" />

            {/* Header */}
            <div className="flex items-start justify-between pt-2 mb-4">
              {headerContent}
              <CloseButton onClick={onClose} className="ml-2" />
            </div>

            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
