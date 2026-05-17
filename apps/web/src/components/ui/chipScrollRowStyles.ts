import type { ReactNode } from 'react';
import {
  LEAD_CHIP_ALL_ACTIVE,
  LEAD_CHIP_ALL_INACTIVE,
  type LeadChipToneKey,
} from '@/components/ui/leadChipStyles';

export type ChipScrollItem = {
  key: string;
  label: ReactNode;
  onClear?: () => void;
  /** CRM-статус — цвет из leadChipStyles */
  tone?: LeadChipToneKey;
  inactiveClass?: string;
  activeClass?: string;
};

export const chipScrollInactiveClass =
  'bg-(--color_bg_card) border-(--color_border) text-(--color_text_muted) hover:text-(--color_text_secondary) hover:bg-(--color_bg_card_hover) hover:border-(--color_primary_light)/35';

/** Только для pill-режима (фон рисует скользящая таблетка) */
export const chipScrollActiveClass =
  'border-transparent bg-transparent text-(--color_text_primary)';

export const chipScrollColoredInactiveFallback = LEAD_CHIP_ALL_INACTIVE;

export const chipScrollColoredActiveFallback = LEAD_CHIP_ALL_ACTIVE;
