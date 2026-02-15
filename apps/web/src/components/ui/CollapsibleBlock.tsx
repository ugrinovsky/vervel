import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronUpIcon } from '@heroicons/react/24/solid';

interface CollapsibleBlockProps {
  title: string;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}

export default function CollapsibleBlock({
  title,
  defaultOpen = true,
  className = '',
  children,
}: CollapsibleBlockProps) {
  return (
    <Disclosure defaultOpen={defaultOpen}>
      {({ open }) => (
        <div className={`glass rounded-lg overflow-hidden ${className}`}>
          <DisclosureButton className="flex justify-between items-center w-full px-4 py-3 font-semibold text-white hover:bg-[var(--color_bg_card_hover)] transition group">
            <span className="text-base">{title}</span>
            <ChevronUpIcon
              className={`w-5 h-5 text-[var(--color_text_muted)] group-hover:text-emerald-400 transition-all duration-300 ${open ? 'rotate-180' : ''}`}
            />
          </DisclosureButton>

          <DisclosurePanel className="px-4 pb-4 transition-all duration-300">
            <div className="h-px bg-[var(--color_border)] mb-4" />
            {children}
          </DisclosurePanel>
        </div>
      )}
    </Disclosure>
  );
}
