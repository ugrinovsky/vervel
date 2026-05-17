import type { ReactNode } from 'react';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';

export interface CollapsibleSectionProps {
  title: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  panelClassName?: string;
  children: ReactNode | ((open: boolean) => ReactNode);
}

/**
 * Компактный раскрывающийся блок (по умолчанию свёрнут).
 * Для вторичных секций — «Другие способы», доп. настройки.
 */
export default function CollapsibleSection({
  title,
  defaultOpen = false,
  className = '',
  panelClassName = '',
  children,
}: CollapsibleSectionProps) {
  return (
    <Disclosure defaultOpen={defaultOpen}>
      {({ open }) => (
        <div
          className={`rounded-xl border border-(--color_border) bg-(--color_bg_card_hover) overflow-hidden ${className}`}
        >
          <DisclosureButton
            as={Button}
            type="button"
            variant="unstyled"
            fullWidth
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-(--color_text_secondary) hover:text-white hover:bg-white/[0.06] transition-colors group"
          >
            <span>{title}</span>
            <ChevronRightIcon
              className={`w-4 h-4 shrink-0 text-(--color_text_muted) transition-transform duration-200 group-hover:text-(--color_primary_light) ${open ? 'rotate-90' : ''}`}
              aria-hidden
            />
          </DisclosureButton>

          <DisclosurePanel
            className={`border-t border-(--color_border) px-3 pb-3 pt-2 ${panelClassName}`}
          >
            {typeof children === 'function' ? children(open) : children}
          </DisclosurePanel>
        </div>
      )}
    </Disclosure>
  );
}
