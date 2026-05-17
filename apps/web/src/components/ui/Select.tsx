import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { ChevronDownIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  /** 'input' — bg_input field style (default). 'card' — bg_card_hover button style with accent when selected. */
  variant?: 'input' | 'card';
}

export default function Select({
  value,
  options,
  onChange,
  placeholder = 'Выберите...',
  label,
  className = '',
  variant = 'input',
}: SelectProps) {
  const selected = options.find((o) => o.value === value) ?? null;

  const buttonClass =
    variant === 'card'
      ? `w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm text-left transition-colors border group outline-none ${
          selected
            ? 'bg-(--color_primary_light)/10 border-(--color_primary_light) text-white'
            : 'bg-(--color_bg_card_hover) border-(--color_border) text-(--color_text_muted) hover:text-white'
        }`
      : 'w-full flex items-center justify-between gap-2 bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-3 text-white text-sm outline-none data-[open]:border-(--color_primary_light) transition-colors text-left group';

  return (
    <div className={`w-full ${className}`}>
      {label && <label className="block text-xs text-(--color_text_muted) mb-1">{label}</label>}
      <Listbox value={value} onChange={onChange}>
        <div className="relative">
          <ListboxButton className={buttonClass}>
            <span className={selected ? 'text-white' : 'text-(--color_text_muted)'}>
              {selected?.label ?? placeholder}
            </span>
            {variant === 'card' ? (
              <ChevronDownIcon className="w-4 h-4 shrink-0 opacity-50 transition-transform group-data-[open]:rotate-180" />
            ) : (
              <ChevronUpDownIcon className="w-4 h-4 shrink-0 text-(--color_text_muted)" />
            )}
          </ListboxButton>
          <ListboxOptions
            className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border border-(--color_border) shadow-xl overflow-hidden focus:outline-none"
            style={{ backgroundColor: 'var(--color_bg_dropdown)' }}
          >
            {options.map((opt) => (
              <ListboxOption
                key={opt.value}
                value={opt.value}
                className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-white cursor-pointer transition-colors data-[focus]:bg-white/10 data-[selected]:text-(--color_primary_light)"
              >
                <span>{opt.label}</span>
                <CheckIcon className="w-4 h-4 shrink-0 invisible data-[selected]:visible" />
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>
    </div>
  );
}
