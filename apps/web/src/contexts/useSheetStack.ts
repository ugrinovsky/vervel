import { useContext } from 'react';
import { SheetStackReactContext } from './sheet-stack-react-context';
import type { SheetStackContextValue } from './sheet-stack-types';

export function useSheetStack(): SheetStackContextValue | null {
  return useContext(SheetStackReactContext);
}
