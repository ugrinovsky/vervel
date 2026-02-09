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
          <DisclosureButton className="flex justify-between items-center w-full p-2  font-medium">
            <span>{title}</span>
            <ChevronUpIcon
              className={`w-5 h-5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            />
          </DisclosureButton>

          <DisclosurePanel className="p-2  transition-all duration-300">
            <div className="h-px bg-gray-400/20 mb-3" />
            {children}
          </DisclosurePanel>
        </div>
      )}
    </Disclosure>
  );
}
