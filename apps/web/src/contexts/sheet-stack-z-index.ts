import type { SheetStackEntry } from './sheet-stack-types';
import { SHEET_Z_BASE, SHEET_Z_STEP } from './sheet-stack-types';

export function sheetZIndexForId(stack: readonly SheetStackEntry[], id: string): number {
  const i = stack.findIndex((e) => e.id === id);
  if (i < 0) return SHEET_Z_BASE;
  return SHEET_Z_BASE + i * SHEET_Z_STEP;
}
