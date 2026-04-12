import {
  type PropsWithChildren,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import CloseButton from '@/components/ui/CloseButton';
import { useSheetStack, sheetZIndexForId } from '@/contexts/SheetStackContext';

interface Props extends PropsWithChildren {
  id?: string;
  open: boolean;
  onClose: () => void;
  /** Convenience: emoji + text title. Ignored if `header` is provided. */
  title?: string;
  emoji?: string;
  /** Custom header content rendered to the left of the ✕ button. */
  header?: ReactNode;
  /**
   * Только если нет SheetStackProvider: фиксированный слой.
   * С провайдером z-index берётся из стека автоматически.
   */
  layer?: 'base' | 'overlay';
  /**
   * Только без провайдера: локальная блокировка скролла.
   * С SheetStackProvider блокировка одна на всё дерево.
   */
  scrollLock?: boolean;
  /**
   * Только без провайдера: Escape закрывает этот шит.
   * С провайдером Escape обрабатывает только верхний слой стека.
   */
  escapeCloses?: boolean;
  /**
   * Не участвовать в глобальном стеке (тесты / особые случаи).
   * Тогда работают layer / scrollLock / escapeCloses как раньше.
   */
  isolateFromStack?: boolean;
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
      <div ref={contentRef} className="p-px">
        {children}
      </div>
    </motion.div>
  );
}

export default function BottomSheet({
  id,
  open,
  onClose,
  title,
  emoji,
  header,
  children,
  layer = 'base',
  scrollLock = true,
  escapeCloses = true,
  isolateFromStack = false,
}: Props) {
  const dragControls = useDragControls();
  const sheetStack = useSheetStack();
  const reactId = useId();
  const stackId = `${id ?? 'bottom-sheet'}-${reactId}`;
  const closeRef = useRef<(() => void) | null>(null);
  closeRef.current = onClose;

  const useGlobalStack = Boolean(sheetStack) && !isolateFromStack;
  // Только стабильная subscribe — не весь context value (он меняется при каждом setStack и рвёт эффект → цикл).
  const stackSubscribe = sheetStack?.subscribe;
  const stackList = sheetStack?.stack;

  useLayoutEffect(() => {
    if (!open || !useGlobalStack || !stackSubscribe) return;
    return stackSubscribe(stackId, closeRef);
  }, [open, useGlobalStack, stackSubscribe, stackId]);

  const zIndex = useMemo(() => {
    if (!useGlobalStack || !stackList) {
      return layer === 'overlay' ? 70 : 60;
    }
    return sheetZIndexForId(stackList, stackId);
  }, [useGlobalStack, stackList, stackId, layer]);

  useBodyScrollLock(open && scrollLock && !useGlobalStack);
  useEscapeKey(onClose, open && escapeCloses && !useGlobalStack);

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
          id={id}
          className="bottom-sheet fixed inset-0 flex items-end"
          style={{ zIndex }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60" onTouchMove={(e) => e.preventDefault()} />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 0) onClose();
            }}
            onClick={(e) => e.stopPropagation()}
            className="background relative w-full rounded-t-3xl p-6 pb-6 max-h-[90dvh] overflow-y-auto overscroll-contain justify-center flex"
            style={{
              backgroundColor: 'var(--color_bg_card)',
              borderTop: '1px solid var(--color_border)',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.2)',
            }}
          >
            <div className={'max-w-[798px] w-full h-max'}>
              {/* Handle — расширенная touch-зона */}
              <div
                className="absolute top-0 left-0 right-0 h-8 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

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
