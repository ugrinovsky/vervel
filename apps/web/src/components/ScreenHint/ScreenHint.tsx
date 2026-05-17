import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface ScreenHintProps {
  emoji?: string;
  children: ReactNode;
  className?: string;
}

export default function ScreenHint({ emoji = '💡', children, className = '' }: ScreenHintProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.08 }}
      className={`glass rounded-xl px-4 py-3 flex items-start gap-3 mb-2 ${className}`}
    >
      <span className="text-xl shrink-0">{emoji}</span>
      <div className="text-xs text-(--color_text_muted) leading-relaxed">{children}</div>
    </motion.div>
  );
}
