import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import ChatBox from '@/components/ChatBox/ChatBox';

interface FullScreenChatProps {
  open: boolean;
  chatId: number | null;
  title: string;
  onClose: () => void;
}

export default function FullScreenChat({ open, chatId, title, onClose }: FullScreenChatProps) {
  return (
    <AnimatePresence>
      {open && chatId && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="background fixed inset-x-0 top-0 bottom-16 z-50 bg-(--color_bg) flex flex-col"
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-(--color_border) shrink-0">
            <button
              onClick={onClose}
              className="p-1 text-(--color_text_muted) hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <span className="text-base font-semibold text-white truncate">{title}</span>
          </div>
          <ChatBox chatId={chatId} className="flex-1 min-h-0" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
