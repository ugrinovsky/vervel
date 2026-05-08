import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import type { CopilotExplainItem } from '@/api/workouts';

interface Props {
  items: CopilotExplainItem[];
}

export default function ExplainWhy({ items }: Props) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  // Превью: первый пункт в свёрнутом виде
  const preview = items[0];

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-xs text-(--color_text_muted) flex-1">
          {open ? 'Скрыть' : `▸ ${preview.title}`}
        </span>
        <ChevronDownIcon
          className={`w-3.5 h-3.5 text-white/30 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2.5 border-t border-white/10 pt-2.5">
              {items.map((item) => (
                <div key={item.key}>
                  <div className="text-xs font-medium text-white/80">{item.title}</div>
                  <div className="text-xs text-(--color_text_muted) mt-0.5">{item.detail}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
