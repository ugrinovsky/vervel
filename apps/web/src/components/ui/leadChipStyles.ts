/** Цветные тона CRM-чипов — полные строки классов для Tailwind и ChipScrollRow. */

export type LeadChipToneKey = 'new' | 'contacted' | 'trial' | 'converted' | 'lost';

export const LEAD_CHIP_TONES: Record<
  LeadChipToneKey,
  { inactive: string; active: string }
> = {
  new: {
    inactive: 'border-amber-500/25 bg-amber-500/15 text-amber-300/90',
    active: 'border-amber-400 bg-amber-500/30 text-amber-50',
  },
  contacted: {
    inactive: 'border-blue-500/25 bg-blue-500/15 text-blue-300/90',
    active: 'border-blue-400 bg-blue-500/30 text-blue-50',
  },
  trial: {
    inactive: 'border-purple-500/25 bg-purple-500/15 text-purple-300/90',
    active: 'border-purple-400 bg-purple-500/30 text-purple-50',
  },
  converted: {
    inactive: 'border-green-500/25 bg-green-500/15 text-green-300/90',
    active: 'border-green-400 bg-green-500/30 text-green-50',
  },
  lost: {
    inactive: 'border-gray-500/25 bg-gray-500/15 text-gray-400/90',
    active: 'border-gray-400 bg-gray-500/30 text-gray-100',
  },
};

export const LEAD_CHIP_ALL_INACTIVE =
  'border-(--color_border) bg-(--color_bg_card) text-(--color_text_muted)';

export const LEAD_CHIP_ALL_ACTIVE =
  'border-(--color_primary_light) bg-(--color_primary_light)/30 text-white';

export function leadChipToneClasses(
  tone: LeadChipToneKey | undefined,
  isActive: boolean,
  overrides?: { inactiveClass?: string; activeClass?: string },
): string {
  if (isActive && overrides?.activeClass) return overrides.activeClass;
  if (!isActive && overrides?.inactiveClass) return overrides.inactiveClass;
  if (tone && LEAD_CHIP_TONES[tone]) {
    return isActive ? LEAD_CHIP_TONES[tone].active : LEAD_CHIP_TONES[tone].inactive;
  }
  return isActive ? LEAD_CHIP_ALL_ACTIVE : LEAD_CHIP_ALL_INACTIVE;
}
