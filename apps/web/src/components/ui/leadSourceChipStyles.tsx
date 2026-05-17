import { NoSymbolIcon } from '@heroicons/react/24/outline';
import type { ChoiceChipOption } from '@/components/ui/ChoiceChips';

export type LeadSourceValue = '' | 'referral' | 'instagram' | 'gym' | 'other';

/** Цветные чипы «Откуда клиент» в AddAthleteDrawer и др. */
export const LEAD_SOURCE_CHIP_OPTIONS: ChoiceChipOption<LeadSourceValue>[] = [
  {
    value: '',
    label: (
      <>
        <NoSymbolIcon className="w-4 h-4 shrink-0" aria-hidden />
        <span className="sr-only">Не указано</span>
      </>
    ),
    compact: true,
    inactiveClass: 'border-gray-500/25 bg-gray-500/15 text-gray-400/90',
    activeClass: 'border-gray-400 bg-gray-500/30 text-gray-100',
  },
  {
    value: 'referral',
    label: 'Сарафан',
    inactiveClass: 'border-emerald-500/25 bg-emerald-500/15 text-emerald-300/90',
    activeClass: 'border-emerald-400 bg-emerald-500/30 text-emerald-50',
  },
  {
    value: 'instagram',
    label: 'Instagram',
    inactiveClass: 'border-pink-500/25 bg-pink-500/15 text-pink-300/90',
    activeClass: 'border-pink-400 bg-pink-500/30 text-pink-50',
  },
  {
    value: 'gym',
    label: 'Зал',
    inactiveClass: 'border-blue-500/25 bg-blue-500/15 text-blue-300/90',
    activeClass: 'border-blue-400 bg-blue-500/30 text-blue-50',
  },
  {
    value: 'other',
    label: 'Другое',
    inactiveClass: 'border-amber-500/25 bg-amber-500/15 text-amber-300/90',
    activeClass: 'border-amber-400 bg-amber-500/30 text-amber-50',
  },
];
