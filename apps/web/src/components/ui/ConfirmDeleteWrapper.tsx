import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TrashIcon } from '@heroicons/react/24/outline';

const Ctx = createContext<{ trigger: () => void } | null>(null);

interface WrapperProps {
  onConfirm: () => void;
  label?: string;
  className?: string;
  rounded?: string;
  overlayLayout?: 'row' | 'column';
  normalBorder?: string;
  /** Renders outside the blur wrapper — use for absolutely positioned Triggers */
  trigger?: React.ReactNode;
  children: React.ReactNode;
}

function ConfirmDeleteWrapper({
  onConfirm,
  label = 'Удалить?',
  className = '',
  rounded = 'rounded-xl',
  overlayLayout = 'row',
  normalBorder = 'border-(--color_border)',
  trigger,
  children,
}: WrapperProps) {
  const [confirming, setConfirming] = useState(false);
  const [contentBlocked, setContentBlocked] = useState(false);
  const unblockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (unblockTimer.current) clearTimeout(unblockTimer.current); }, []);

  const open = () => {
    if (unblockTimer.current) clearTimeout(unblockTimer.current);
    setContentBlocked(true);
    setConfirming(true);
  };

  const close = () => {
    setConfirming(false);
    unblockTimer.current = setTimeout(() => setContentBlocked(false), 200);
  };

  const stopAll = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <Ctx.Provider value={{ trigger: open }}>
      <div
        className={`relative ${rounded} border overflow-hidden transition-colors ${
          confirming ? 'border-red-500/70' : normalBorder
        }`}
      >
        {/* Blur wrapper — carries the layout className, blurs on confirm */}
        <div className={`w-full min-w-0 ${className} ${contentBlocked ? 'blur-[2px] pointer-events-none select-none' : ''}`}>
          {children}
        </div>

        {/* Trigger rendered outside blur wrapper (for absolute-positioned trash icons) */}
        {trigger}

        <AnimatePresence>
          {confirming && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onPointerDown={stopAll}
              onClick={stopAll}
              className={`absolute inset-0 z-10 ${rounded} bg-black/30 backdrop-blur-sm border border-red-500/50 flex items-center justify-center gap-2 ${
                overlayLayout === 'column' ? 'flex-col' : ''
              }`}
            >
              <span className={`text-white font-medium ${overlayLayout === 'column' ? 'text-xs' : 'text-sm'}`}>
                {label}
              </span>
              <div className="flex gap-2">
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  onPointerDown={stopAll}
                  onClick={(e) => { stopAll(e); onConfirm(); close(); }}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                >
                  Да
                </motion.button>
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 }}
                  onPointerDown={stopAll}
                  onClick={(e) => { stopAll(e); close(); }}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  Нет
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

function Trigger({ className = '' }: { className?: string }) {
  const ctx = useContext(Ctx);
  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); ctx?.trigger(); }}
      className={`p-1 text-(--color_text_muted) hover:text-red-400 transition-colors ${className}`}
    >
      <TrashIcon className="w-4 h-4" />
    </button>
  );
}

ConfirmDeleteWrapper.Trigger = Trigger;

export default ConfirmDeleteWrapper;
