import { PropsWithChildren, useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import './styles.css';

const PULL_TRIGGER = 62; // visual px to trigger refresh
const MAX_VISUAL = 90;   // max visual pull
const DAISY_SIZE = 64;   // px — daisy container height
const PETAL_COUNT = 8;

interface ScreenProps {
  /** Показать спиннер вместо дочерних элементов */
  loading?: boolean;
  className?: string;
  /** Если задан — включает pull-to-refresh */
  onRefresh?: () => Promise<void>;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] w-full">
      <div className="w-8 h-8 border-2 border-white/20 border-t-(--color_primary_light) rounded-full animate-spin" />
    </div>
  );
}

function DaisySVG({ progress, spinning }: { progress: number; spinning: boolean }) {
  const petalsLit = Math.ceil(progress * PETAL_COUNT);
  return (
    <motion.svg
      viewBox="-4 -4 68 68"
      width={46}
      height={46}
      animate={spinning ? { rotate: 360 } : { rotate: 0 }}
      transition={
        spinning
          ? { duration: 1.4, repeat: Infinity, ease: 'linear' }
          : { type: 'spring', stiffness: 180, damping: 18 }
      }
    >
      {/* Petals — 8 шт., заполняются по часовой стрелке, начиная сверху */}
      {Array.from({ length: PETAL_COUNT }).map((_, i) => {
        const angle = (i * 360) / PETAL_COUNT - 90;
        const lit = i < petalsLit;
        return (
          <g key={i} transform={`rotate(${angle}, 30, 30)`}>
            <ellipse
              cx="30"
              cy="12"
              rx="5.5"
              ry="10.5"
              fill={lit ? 'rgba(255,255,255,0.93)' : 'rgba(255,255,255,0.1)'}
              style={{ transition: 'fill 0.08s ease' }}
            />
          </g>
        );
      })}
      {/* Жёлтый центр */}
      <circle cx="30" cy="30" r="10" fill="#fbbf24" />
      {/* Текстура центра */}
      <circle cx="27" cy="28" r="1.7" fill="#78350f" opacity="0.45" />
      <circle cx="33" cy="28" r="1.7" fill="#78350f" opacity="0.45" />
      <circle cx="30" cy="33" r="1.7" fill="#78350f" opacity="0.45" />
      <circle cx="30" cy="24" r="1.4" fill="#78350f" opacity="0.35" />
    </motion.svg>
  );
}

export default function Screen({
  children,
  loading,
  className = '',
  onRefresh,
}: PropsWithChildren<ScreenProps>) {
  const screenRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef(0);
  const isPullingRef = useRef(false);
  const isRefreshingRef = useRef(false);

  const [pullProgress, setPullProgress] = useState(0); // 0–1, для лепестков
  const [isRefreshing, setIsRefreshing] = useState(false);

  // rawY изменяется мгновенно, springY следует за ним с физикой пружины
  const rawY = useMotionValue(0);
  const springY = useSpring(rawY, { stiffness: 380, damping: 34, mass: 0.55 });

  // Ромашка появляется сверху: при springY=0 → y=-DAISY_SIZE (скрыта), при springY=DAISY_SIZE → y=0
  const daisyY = useTransform(springY, (v) => v - DAISY_SIZE);
  const daisyOpacity = useTransform(springY, [0, 18, PULL_TRIGGER], [0, 0.35, 1]);
  const daisyScale = useTransform(springY, [0, PULL_TRIGGER], [0.45, 1]);

  useEffect(() => {
    const el = screenRef.current;
    if (!el || !onRefresh) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartYRef.current = e.touches[0].clientY;
      isPullingRef.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;
      if (el.scrollTop > 0) return; // не на верху — обычный скролл

      const dy = e.touches[0].clientY - touchStartYRef.current;
      if (dy <= 4) return;

      e.preventDefault();
      isPullingRef.current = true;

      // Сопротивление: sqrt-кривая, ощущается как резинка
      const visual = Math.min(Math.sqrt(dy) * 7.2, MAX_VISUAL);
      rawY.set(visual);
      setPullProgress(Math.min(visual / PULL_TRIGGER, 1));
    };

    const onTouchEnd = async () => {
      if (!isPullingRef.current) return;
      isPullingRef.current = false;
      if (isRefreshingRef.current) return;

      const visual = rawY.get();

      if (visual >= PULL_TRIGGER * 0.88) {
        // Достаточно потянул — запускаем обновление
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        setPullProgress(1);
        rawY.set(PULL_TRIGGER * 0.92); // удерживаем позицию пока грузится

        try {
          await onRefresh();
        } finally {
          isRefreshingRef.current = false;
          setIsRefreshing(false);
          setPullProgress(0);
          rawY.set(0);
        }
      } else {
        // Не дотянул — возврат
        setPullProgress(0);
        rawY.set(0);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [onRefresh, rawY]);

  return (
    <>
      {/* Ромашка — фиксированная, съезжает сверху по мере натяжения */}
      {onRefresh && (
        <motion.div
          style={{
            position: 'fixed',
            top: 'env(safe-area-inset-top, 0px)',
            left: '50%',
            x: '-50%',
            y: daisyY,
            opacity: daisyOpacity,
            scale: daisyScale,
            zIndex: 50,
            pointerEvents: 'none',
            width: DAISY_SIZE,
            height: DAISY_SIZE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <DaisySVG progress={pullProgress} spinning={isRefreshing} />
        </motion.div>
      )}

      <motion.div
        ref={screenRef}
        className={`screen flex flex-col items-stretch justify-center h-full w-full max-w-[798px] mx-auto ${className}`.trim()}
        style={onRefresh ? { y: springY } : undefined}
      >
        {loading ? <PageLoader /> : children}
      </motion.div>
    </>
  );
}
