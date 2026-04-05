import { PropsWithChildren, useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import './styles.css';

const PULL_TRIGGER = 62;
const MAX_VISUAL = 90;
const INDICATOR_SIZE = 28; // px

interface ScreenProps {
  /** Показать спиннер вместо дочерних элементов */
  loading?: boolean;
  className?: string;
  /** Колбэк обновления. По умолчанию — window.location.reload() */
  onRefresh?: () => Promise<void>;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] w-full">
      <div className="w-8 h-8 border-2 border-white/20 border-t-(--color_primary_light) rounded-full animate-spin" />
    </div>
  );
}

function PullSpinner({ progress, spinning }: { progress: number; spinning: boolean }) {
  const rotate = spinning ? undefined : progress * 270;
  return (
    <motion.div
      className="rounded-full border-2 border-white/20 border-t-(--color_primary_light)"
      style={{ width: INDICATOR_SIZE, height: INDICATOR_SIZE }}
      animate={spinning ? { rotate: 360 } : { rotate }}
      transition={
        spinning
          ? { duration: 0.7, repeat: Infinity, ease: 'linear' }
          : { type: 'tween', duration: 0 }
      }
    />
  );
}

const defaultRefresh = () => new Promise<void>((resolve) => {
  window.location.reload();
  resolve();
});

export default function Screen({
  children,
  loading,
  className = '',
  onRefresh = defaultRefresh,
}: PropsWithChildren<ScreenProps>) {
  const screenRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef(0);
  // hasPulled: стал true при первом пересечении порога, остаётся true до touchend
  // После этого e.preventDefault() вызывается на КАЖДЫЙ touchmove — браузер не скроллит
  const hasPulledRef = useRef(false);
  const isRefreshingRef = useRef(false);

  const [pullProgress, setPullProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const rawY = useMotionValue(0);
  const springY = useSpring(rawY, { stiffness: 380, damping: 34, mass: 0.55 });

  const SLOT = INDICATOR_SIZE + 16;
  const indicatorY = useTransform(springY, (v) => v - SLOT);
  const indicatorOpacity = useTransform(springY, [0, 8, PULL_TRIGGER], [0, 0.6, 1]);
  const indicatorScale = useTransform(springY, [0, PULL_TRIGGER], [0, 1]);

  useEffect(() => {
    const el = screenRef.current;
    if (!el || !onRefresh) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartYRef.current = e.touches[0].clientY;
      hasPulledRef.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;

      const dy = e.touches[0].clientY - touchStartYRef.current;

      if (hasPulledRef.current) {
        // Уже тянули — preventDefault на весь жест, браузер не получит шанса скроллить
        e.preventDefault();
        // visual напрямую из dy: dy<=0 → 0, иначе sqrt-кривая
        const visual = dy > 0 ? Math.min(Math.sqrt(dy) * 7.2, MAX_VISUAL) : 0;
        rawY.set(visual);
        setPullProgress(Math.min(visual / PULL_TRIGGER, 1));
        return;
      }

      // Ещё не тянули — ждём порог
      if (el.scrollTop > 0) return;
      if (dy <= 4) return;

      // Порог пересечён — начинаем
      e.preventDefault();
      hasPulledRef.current = true;
      const visual = Math.min(Math.sqrt(dy) * 7.2, MAX_VISUAL);
      rawY.set(visual);
      setPullProgress(Math.min(visual / PULL_TRIGGER, 1));
    };

    const resetRaw = () => {
      hasPulledRef.current = false;
      setPullProgress(0);
      rawY.set(0);
    };

    const onTouchEnd = async () => {
      if (isRefreshingRef.current) return;
      const visual = rawY.get();


      if (!hasPulledRef.current || visual <= 0) {
        if (visual > 0) rawY.set(0);
        hasPulledRef.current = false;
        return;
      }

      hasPulledRef.current = false;

      if (visual >= PULL_TRIGGER * 0.88) {
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        setPullProgress(1);
        rawY.set(PULL_TRIGGER * 0.92);
        try {
          await onRefresh();
        } finally {
          isRefreshingRef.current = false;
          setIsRefreshing(false);
          setPullProgress(0);
          rawY.set(0);
        }
      } else {
        resetRaw();
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', resetRaw);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', resetRaw);
    };
  }, [onRefresh, rawY]);

  return (
    <>
      <motion.div
        style={{
          position: 'fixed',
          top: 'env(safe-area-inset-top, 0px)',
          left: '50%',
          x: '-50%',
          y: indicatorY,
          opacity: indicatorOpacity,
          scale: indicatorScale,
          zIndex: 50,
          pointerEvents: 'none',
          width: INDICATOR_SIZE,
          height: INDICATOR_SIZE,
        }}
      >
        <PullSpinner progress={pullProgress} spinning={isRefreshing} />
      </motion.div>

      <motion.div
        ref={screenRef}
        className={`screen flex flex-col items-stretch justify-center h-full w-full max-w-[798px] mx-auto ${className}`.trim()}
        style={{ y: springY }}
      >
        {loading ? <PageLoader /> : children}
      </motion.div>
    </>
  );
}
