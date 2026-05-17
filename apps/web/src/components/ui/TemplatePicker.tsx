import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import type { WorkoutTemplate } from '@/api/trainer';

const TYPE_BADGE: Record<string, string> = {
  bodybuilding: 'Сил',
  crossfit: 'CF',
  cardio: 'Кард',
};

interface Props {
  templates: WorkoutTemplate[];
  value: number | null;
  onChange: (id: number | null) => void;
}

export default function TemplatePicker({ templates, value, onChange }: Props) {
  const selected = value != null ? (templates.find((t) => t.id === value) ?? null) : null;

  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <ListboxButton
          className={`group w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm text-left transition-colors border outline-none ${
            selected
              ? 'bg-(--color_primary_light)/10 border-(--color_primary_light) text-white'
              : 'bg-(--color_bg_card_hover) border-(--color_border) text-(--color_text_muted) hover:text-white'
          }`}
        >
          <span>{selected ? `📋 ${selected.name}` : '📋 Без шаблона'}</span>
          <ChevronDownIcon className="w-4 h-4 shrink-0 opacity-50 transition-transform group-data-[open]:rotate-180" />
        </ListboxButton>
        <ListboxOptions
          className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border border-(--color_border) shadow-xl overflow-hidden focus:outline-none"
          style={{ backgroundColor: 'var(--color_bg_dropdown)' }}
        >
          <ListboxOption
            value={null}
            className="flex items-center px-3 py-2.5 text-sm cursor-pointer transition-colors data-[focus]:bg-white/10 data-[selected]:text-(--color_primary_light) text-(--color_text_muted) data-[selected]:text-white"
          >
            Без шаблона
          </ListboxOption>
          {templates.map((t) => (
            <ListboxOption
              key={t.id}
              value={t.id}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-white cursor-pointer transition-colors data-[focus]:bg-white/10"
            >
              <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-(--color_primary_light)">
                {TYPE_BADGE[t.workoutType] ?? '?'}
              </span>
              <span className="flex-1 truncate">{t.name}</span>
              {(t.exercises?.length ?? 0) > 0 && (
                <span className="text-xs text-(--color_text_muted) shrink-0">
                  {t.exercises.length} упр.
                </span>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
