import { type PropsWithChildren, type ReactNode, useEffect, useRef, useState } from 'react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { createPortal } from 'react-dom';
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

function AnimatedHeight({ children }: { children: ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
      setHeight(h);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      animate={{ height: height ?? 'auto' }}
      transition={{ type: 'spring', damping: 30, stiffness: 250 }}
      style={{ overflow: 'hidden' }}
    >
      <div ref={contentRef} className="p-px">{children}</div>
    </motion.div>
  );
}

export default function BottomSheet({ open, onClose, title, emoji, header, children }: Props) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEscapeKey(onClose, open);

  const headerContent = header ?? (
    <div className="flex items-center gap-2">
      {emoji && <span className="text-2xl">{emoji}</span>}
      <span className="text-lg font-bold text-white">{title}</span>
    </div>
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="bottom-sheet fixed inset-0 z-60 flex items-end"
          onClick={onClose}
        >
          <div
            className="absolute inset-0 bg-black/60"
            onTouchMove={(e) => e.preventDefault()}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="background relative w-full rounded-t-3xl p-6 pb-6 max-h-[90dvh] overflow-y-auto overscroll-contain justify-center flex"
            style={{ backgroundColor: 'var(--color_bg_card)', borderTop: '1px solid var(--color_border)', boxShadow: '0 -4px 20px rgba(0,0,0,0.2)' }}
          >
            <div className={'max-w-[798px] w-full h-max'}>
              {/* Handle */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/20" />

              {/* Header */}
              <div className="flex items-start justify-between pt-2 mb-4">
                {headerContent}
                <CloseButton onClick={onClose} className="ml-2" />
              </div>

              <AnimatedHeight>{children}</AnimatedHeight>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
