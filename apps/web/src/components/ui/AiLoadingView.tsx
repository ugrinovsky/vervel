import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon } from '@heroicons/react/24/outline';

interface Props {
  steps: string[];
}

export default function AiLoadingView({ steps }: Props) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => (i + 1) % steps.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [steps]);

  return (
    <motion.div
      key="loader"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col items-center justify-center gap-5 py-12"
    >
      <div className="relative flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-20 h-20 rounded-full bg-emerald-500/30"
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.15, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          className="absolute w-14 h-14 rounded-full bg-emerald-400/30"
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="relative z-10 w-10 h-10 flex items-center justify-center rounded-full bg-linear-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/40"
        >
          <SparklesIcon className="w-5 h-5 text-white" />
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={stepIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="text-sm text-emerald-300 font-medium"
        >
          {steps[stepIndex]}
        </motion.p>
      </AnimatePresence>

      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <motion.div
            key={i}
            animate={{ opacity: i === stepIndex ? 1 : 0.25 }}
            transition={{ duration: 0.3 }}
            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
          />
        ))}
      </div>
    </motion.div>
  );
}
