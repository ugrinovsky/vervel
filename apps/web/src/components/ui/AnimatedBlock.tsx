import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface AnimatedBlockProps {
  delay?: number;
  className?: string;
  children?: ReactNode;
}

/** Content block with standard animation: enters from bottom, exits upward. */
export default function AnimatedBlock({
  delay = 0,
  className = '',
  children,
}: AnimatedBlockProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
