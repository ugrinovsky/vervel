import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { SheetStackReactContext } from './sheet-stack-react-context';
import type { SheetStackContextValue, SheetStackEntry } from './sheet-stack-types';
import { MAX_SHEETS } from './sheet-stack-types';

export function SheetStackProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<SheetStackEntry[]>([]);

  const subscribe = useCallback(
    (id: string, closeRef: SheetStackEntry['closeRef']) => {
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
    [],
  );

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

  const value = useMemo<SheetStackContextValue>(() => ({ stack, subscribe }), [stack, subscribe]);

  return (
    <SheetStackReactContext.Provider value={value}>{children}</SheetStackReactContext.Provider>
  );
}
