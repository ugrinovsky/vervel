import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { PropsWithChildren } from 'react';
import CloseButton from '@/components/ui/CloseButton';

interface DrawerProps extends PropsWithChildren {
  open: boolean;
  onClose: () => void;
  header: React.ReactNode;
}

export default function Drawer({ open, onClose, header, children }: DrawerProps) {
  return (
    <Dialog open={open} onClose={onClose} className="fixed inset-0 z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/50" />

      <div className="fixed inset-0 flex justify-end bg-(--color_bg_screen)">
        <DialogPanel className="relative w-screen max-w-md [background:var(--color_bg_screen)] h-full flex flex-col shadow-xl">
          <CloseButton onClick={onClose} className="absolute top-3 right-3" />

          <div className="px-4 py-6 border-b border-white/10">
            <DialogTitle>{header}</DialogTitle>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="glass">{children}</div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
