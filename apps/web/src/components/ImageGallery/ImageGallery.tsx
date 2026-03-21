import { useState, useRef, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

function ExerciseImage({ src, title }: { src: string; title: string }) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900/60 to-purple-900/60">
        <span className="text-5xl font-bold text-white/20">{title[0]}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={title}
      className="w-full h-full object-cover"
      onError={() => setError(true)}
    />
  );
}

export default function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [idx, setIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, []);

  if (images.length === 0) {
    return (
      <div className="w-full aspect-video rounded-xl overflow-hidden bg-white/5 flex items-center justify-center mb-4">
        <span className="text-5xl font-bold text-white/20">{title[0]}</span>
      </div>
    );
  }

  const prev = () => setIdx((i) => Math.max(i - 1, 0));
  const next = () => setIdx((i) => Math.min(i + 1, images.length - 1));

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video rounded-xl overflow-hidden mb-4 bg-black/30"
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (dx < -50) next();
        else if (dx > 50) prev();
      }}
    >
      <motion.div
        className="flex h-full"
        style={{ width: containerWidth ? `${images.length * containerWidth}px` : `${images.length * 100}%` }}
        animate={{ x: containerWidth ? -idx * containerWidth : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {images.map((src, i) => (
          <div
            key={i}
            className="h-full shrink-0"
            style={{ width: containerWidth ? `${containerWidth}px` : `${100 / images.length}%` }}
          >
            <ExerciseImage src={src} title={title} />
          </div>
        ))}
      </motion.div>
      {images.length > 1 && (
        <>
          {idx > 0 && (
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
          )}
          {idx < images.length - 1 && (
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/30'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
