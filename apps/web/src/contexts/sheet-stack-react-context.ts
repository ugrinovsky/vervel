import { createContext } from 'react';
import type { SheetStackContextValue } from './sheet-stack-types';

export const SheetStackReactContext = createContext<SheetStackContextValue | null>(null);
