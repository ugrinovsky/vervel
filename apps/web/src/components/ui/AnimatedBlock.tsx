import { motion } from 'framer-motion';
import type { HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  delay?: number;
}

/** Content block with standard animation: enters from bottom, exits upward. */
export default function AnimatedBlock({ delay = 0, className = '', children, ...props }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15, delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
