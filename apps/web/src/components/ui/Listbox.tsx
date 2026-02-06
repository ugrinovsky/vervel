import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/24/solid';

export interface UiListboxOption<T> {
  value: T;
  label: string;
}

interface UiListboxProps<T> {
  value?: UiListboxOption<T> | null;
  options: UiListboxOption<T>[];
  onChange: (value: UiListboxOption<T>) => void;
  placeholder?: string;
}

export default function UiListbox<T>({
  value,
  options,
  onChange,
  placeholder = 'Выберите значение',
}: UiListboxProps<T>) {
  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <ListboxButton
          className="
            w-full flex items-center justify-between
            px-3 py-2 rounded-lg
            bg-white/10 border border-white/20
            text-white
            focus:outline-none focus:ring-2 focus:ring-emerald-400
          "
        >
          <span className={value ? 'text-white' : 'text-white/40'}>
            {value?.label ?? placeholder}
          </span>

          <ChevronUpDownIcon className="w-5 h-5 text-white/50" />
        </ListboxButton>

        <ListboxOptions
          className="
            absolute z-10 mt-2 w-full
            max-h-50 overflow-y-auto 
            rounded-lg border border-white/20
            bg-[rgb(14,58,72)]
            shadow-lg
          "
        >
          {options.map((opt) => (
            <ListboxOption
              key={opt.label}
              value={opt}
              className={({ active, selected }) =>
                `
                  px-3 py-2 cursor-pointer
                  ${active ? 'bg-white/10' : ''}
                  ${selected ? 'text-emerald-400' : 'text-white'}
                `
              }
            >
              {opt.label}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
