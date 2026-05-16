import { motion } from 'framer-motion';

interface SectionBreakProps {
  className?: string;
}

/** Декоративный разрыв между блоками секций (не несёт смысла — только визуал). */
export default function SectionBreak({ className = '' }: SectionBreakProps) {
  return (
    <motion.div
      className={`py-1 ${className}`.trim()}
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="h-px w-full bg-gradient-to-r from-transparent via-(--color_border) to-transparent" />
    </motion.div>
  );
}
