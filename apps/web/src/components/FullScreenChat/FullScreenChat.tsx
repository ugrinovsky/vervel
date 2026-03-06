import { XMarkIcon } from '@heroicons/react/24/outline';
import ChatBox from '@/components/ChatBox/ChatBox';
import ModalOverlay from '@/components/ModalOverlay/ModalOverlay';

interface FullScreenChatProps {
  open: boolean;
  chatId: number | null;
  title: string;
  onClose: () => void;
}

export default function FullScreenChat({ open, chatId, title, onClose }: FullScreenChatProps) {
  return (
    <ModalOverlay open={open && chatId !== null} variant="fullscreen" onClose={onClose}>
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-(--color_border) shrink-0">
        <span className="text-base font-semibold text-white truncate">{title}</span>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors shrink-0"
        >
          <XMarkIcon className="w-4 h-4 text-white" />
        </button>
      </div>
      {chatId && <ChatBox chatId={chatId} className="flex-1 min-h-0" />}
    </ModalOverlay>
  );
}
