import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';

export const SHEET_Z_BASE = 60;
/** Шаг между слоями; 60, 65, 70, … — без пересечения с обычными z-50 UI */
const SHEET_Z_STEP = 5;
const MAX_SHEETS = 40;

export type SheetStackEntry = {
  id: string;
  closeRef: MutableRefObject<(() => void) | null>;
};

export type SheetStackContextValue = {
  stack: readonly SheetStackEntry[];
  /** Вызвать при open=true; вернуть cleanup при close/unmount */
  subscribe: (id: string, closeRef: MutableRefObject<(() => void) | null>) => () => void;
};

const SheetStackContext = createContext<SheetStackContextValue | null>(null);

export function SheetStackProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<SheetStackEntry[]>([]);

  const subscribe = useCallback(
    (id: string, closeRef: MutableRefObject<(() => void) | null>) => {
      setStack((prev) => {
        const without = prev.filter((e) => e.id !== id);
        if (without.length >= MAX_SHEETS) {
          console.warn('[SheetStack] достигнут лимит вложенности', MAX_SHEETS);
          return without;
        }
        return [...without, { id, closeRef }];
      });
      return () => {
        setStack((prev) => prev.filter((e) => e.id !== id));
      };
    },
    []
  );

  // Escape закрывает только верхний шит
  useEffect(() => {
    if (stack.length === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const top = stack[stack.length - 1];
      const fn = top?.closeRef.current;
      if (fn) {
        e.preventDefault();
        e.stopPropagation();
        fn();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [stack]);

  // Один источник блокировки скролла на всё дерево шитов
  useEffect(() => {
    if (stack.length > 0) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [stack.length]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const value = useMemo(() => ({ stack, subscribe }), [stack, subscribe]);

  return <SheetStackContext.Provider value={value}>{children}</SheetStackContext.Provider>;
}

export function useSheetStack(): SheetStackContextValue | null {
  return useContext(SheetStackContext);
}

export function sheetZIndexForId(stack: readonly SheetStackEntry[], id: string): number {
  const i = stack.findIndex((e) => e.id === id);
  if (i < 0) return SHEET_Z_BASE;
  return SHEET_Z_BASE + i * SHEET_Z_STEP;
}
