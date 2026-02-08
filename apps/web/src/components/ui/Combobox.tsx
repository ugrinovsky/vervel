import {
  Combobox,
  ComboboxInput,
  ComboboxOptions,
  ComboboxOption,
  ComboboxButton,
} from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/24/solid';
import { useState } from 'react';

export interface UiOption<T> {
  value: T;
  label: string;
}

interface UiComboboxProps<T> {
  value: UiOption<T> | null;
  options: UiOption<T>[];
  onChange: (value: UiOption<T>) => void;
  placeholder?: string;
}

export default function UiCombobox<T>({
  value,
  options,
  onChange,
  placeholder,
}: UiComboboxProps<T>) {
  const [query, setQuery] = useState('');

  const filtered =
    query === ''
      ? options
      : options.filter((opt) => opt.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <Combobox value={value} onChange={onChange}>
      {({ open }) => (
        <div className="relative">
          <div
            className="
            relative w-full flex items-center
            rounded-lg bg-white/10 border border-white/20
            focus-within:ring-2 focus-within:ring-emerald-400
          "
          >
            <ComboboxInput
              className="
              w-full bg-transparent px-3 py-2
              text-white placeholder-white/40
              focus:outline-none
            "
              displayValue={(opt: UiOption<T>) => opt?.label ?? ''}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
            />

            <ComboboxButton className="px-2">
              <ChevronUpDownIcon className="h-5 w-5 text-white/40" />
            </ComboboxButton>
          </div>

          <ComboboxOptions
            static
            className={`
          absolute z-10 mt-2 w-full
          rounded-lg border border-white/20
          bg-[rgb(14,58,72)]
          shadow-lg max-h-60 overflow-auto
          ${open ? 'block' : 'hidden'}
        `}
          >
            {filtered.map((opt) => (
              <ComboboxOption
                key={opt.label}
                value={opt}
                className={({ active }) =>
                  `px-3 py-2 cursor-pointer ${active ? 'bg-white/10' : ''}`
                }
              >
                {opt.label}
              </ComboboxOption>
            ))}
          </ComboboxOptions>
        </div>
      )}
    </Combobox>
  );
}
