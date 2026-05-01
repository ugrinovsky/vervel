import type { MutableRefObject } from 'react';

export const SHEET_Z_BASE = 60;
/** Шаг между слоями; 60, 65, 70, … — без пересечения с обычными z-50 UI */
export const SHEET_Z_STEP = 5;
export const MAX_SHEETS = 40;

export type SheetStackEntry = {
  id: string;
  closeRef: MutableRefObject<(() => void) | null>;
};

export type SheetStackContextValue = {
  stack: readonly SheetStackEntry[];
  /** Вызвать при open=true; вернуть cleanup при close/unmount */
  subscribe: (id: string, closeRef: MutableRefObject<(() => void) | null>) => () => void;
};
