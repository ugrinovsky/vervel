import { motion } from 'framer-motion';

interface SectionBreakProps {
  /** Три одинаковые точки по центру или короткая полоска-градиент */
  variant?: 'dots' | 'line';
  className?: string;
}

const dotsContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
};

const dotChild = {
  hidden: { opacity: 0, scale: 0.45 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

/** Декоративный разрыв между блоками секций (не несёт смысла — только визуал). */
export default function SectionBreak({ variant = 'dots', className = '' }: SectionBreakProps) {
  if (variant === 'line') {
    return (
      <motion.div
        className={`flex justify-center py-1 ${className}`.trim()}
        aria-hidden
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <motion.div
          className="h-px w-[min(10rem,55%)] rounded-full bg-gradient-to-r from-transparent via-(--color_border) to-transparent origin-center"
          initial={{ scaleX: 0.35, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.38, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`flex justify-center items-center gap-1 py-1 ${className}`.trim()}
      aria-hidden
      variants={dotsContainer}
      initial="hidden"
      animate="show"
    >
      <motion.span
        variants={dotChild}
        className="h-1 w-1 shrink-0 rounded-full bg-(--color_text_muted)/25"
      />
      <motion.span
        variants={dotChild}
        className="h-1 w-1 shrink-0 rounded-full bg-(--color_text_muted)/25"
      />
      <motion.span
        variants={dotChild}
        className="h-1 w-1 shrink-0 rounded-full bg-(--color_text_muted)/25"
      />
    </motion.div>
  );
}
