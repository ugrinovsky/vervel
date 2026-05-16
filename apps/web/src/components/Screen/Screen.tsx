import { PropsWithChildren, useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import './styles.css';

const PULL_TRIGGER = 62;
const MAX_VISUAL = 90;
const INDICATOR_SIZE = 28; // px
const MIN_HOLD_MS = 350; // must hold at/above PULL_TRIGGER for this long to commit refresh

interface ScreenProps {
  /** Показать спиннер вместо дочерних элементов */
  loading?: boolean;
  className?: string;
  /** Колбэк обновления. По умолчанию — window.location.reload() */
  onRefresh?: () => Promise<void>;
  /** Включить pull-to-refresh жест */
  enablePullToRefresh?: boolean;
  /**
   * `nav` — отступ под нижний таббар (по умолчанию).
   * `safe` — только safe area + небольшой зазор (экраны без нижней навигации, например онбординг).
   */
  bottomInset?: 'nav' | 'safe';
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] w-full">
      <LoadingSpinner />
    </div>
  );
}

function PullSpinner({ progress, spinning }: { progress: number; spinning: boolean }) {
  const rotate = spinning ? undefined : progress * 270;
  return (
    <motion.div
      className="flex items-center justify-center"
      style={{ width: INDICATOR_SIZE, height: INDICATOR_SIZE }}
      animate={spinning ? { rotate: 360 } : { rotate }}
      transition={
        spinning
          ? { duration: 0.7, repeat: Infinity, ease: 'linear' }
          : { type: 'tween', duration: 0 }
      }
    >
      <LoadingSpinner size="pull" animated={false} />
    </motion.div>
  );
}

const defaultRefresh = () =>
  new Promise<void>((resolve) => {
    window.location.reload();
    resolve();
  });

export default function Screen({
  children,
  loading,
  className = '',
  onRefresh = defaultRefresh,
  enablePullToRefresh = true,
  bottomInset = 'nav',
}: PropsWithChildren<ScreenProps>) {
  const screenRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef(0);
  /** См. `noPullRefreshProps` / `SortableDragHandle` — не смешивать DnD с pull-to-refresh */
  const pullIgnoredRef = useRef(false);
  // hasPulled: стал true при первом пересечении порога, остаётся true до touchend
  // После этого e.preventDefault() вызывается на КАЖДЫЙ touchmove — браузер не скроллит
  const hasPulledRef = useRef(false);
  const isRefreshingRef = useRef(false);
  // Timestamp когда visual впервые достиг PULL_TRIGGER; null если ниже порога
  const holdStartRef = useRef<number | null>(null);

  const [pullProgress, setPullProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const rawY = useMotionValue(0);
  const springY = useSpring(rawY, { stiffness: 380, damping: 34, mass: 0.55 });

  const SLOT = INDICATOR_SIZE + 16;
  const indicatorY = useTransform(springY, (v) => v - SLOT);
  const indicatorOpacity = useTransform(springY, [0, 8, PULL_TRIGGER], [0, 0.6, 1]);
  const indicatorScale = useTransform(springY, [0, PULL_TRIGGER], [0, 1]);

  useEffect(() => {
    if (!enablePullToRefresh) {
      hasPulledRef.current = false;
      isRefreshingRef.current = false;
      setIsRefreshing(false);
      setPullProgress(0);
      rawY.set(0);
      return;
    }

    const el = screenRef.current;
    if (!el || !onRefresh) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartYRef.current = e.touches[0].clientY;
      hasPulledRef.current = false;
      const t = e.target;
      pullIgnoredRef.current = t instanceof Element && t.closest('[data-no-pull-refresh]') !== null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (pullIgnoredRef.current || isRefreshingRef.current) return;

      const dy = e.touches[0].clientY - touchStartYRef.current;

      if (hasPulledRef.current) {
        // Уже тянули — preventDefault на весь жест, браузер не получит шанса скроллить
        e.preventDefault();
        // visual напрямую из dy: dy<=0 → 0, иначе sqrt-кривая
        const visual = dy > 0 ? Math.min(Math.sqrt(dy) * 7.2, MAX_VISUAL) : 0;
        rawY.set(visual);
        setPullProgress(Math.min(visual / PULL_TRIGGER, 1));
        // Отслеживаем время удержания на пороге
        if (visual >= PULL_TRIGGER) {
          if (holdStartRef.current === null) holdStartRef.current = Date.now();
        } else {
          holdStartRef.current = null;
        }
        return;
      }

      // Ещё не тянули — ждём порог
      if (el.scrollTop > 0) return;
      if (dy <= 10) return;

      // Порог пересечён — начинаем
      e.preventDefault();
      hasPulledRef.current = true;
      const visual = Math.min(Math.sqrt(dy) * 7.2, MAX_VISUAL);
      rawY.set(visual);
      setPullProgress(Math.min(visual / PULL_TRIGGER, 1));
    };

    const resetRaw = () => {
      hasPulledRef.current = false;
      pullIgnoredRef.current = false;
      holdStartRef.current = null;
      setPullProgress(0);
      rawY.set(0);
    };

    const onTouchEnd = async () => {
      if (pullIgnoredRef.current) {
        pullIgnoredRef.current = false;
        return;
      }
      if (isRefreshingRef.current) return;
      const visual = rawY.get();

      if (!hasPulledRef.current || visual <= 0) {
        if (visual > 0) rawY.set(0);
        hasPulledRef.current = false;
        return;
      }

      hasPulledRef.current = false;

      const heldLongEnough =
        holdStartRef.current !== null && Date.now() - holdStartRef.current >= MIN_HOLD_MS;
      holdStartRef.current = null;

      if (visual >= PULL_TRIGGER * 0.88 && heldLongEnough) {
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
  }, [enablePullToRefresh, onRefresh, rawY]);

  return (
    <>
      <motion.div
        style={{
          position: 'fixed',
          top: 'env(safe-area-inset-top, 0px)',
          left: '50%',
          x: '-50%',
          y: indicatorY,
          opacity: enablePullToRefresh ? indicatorOpacity : 0,
          scale: enablePullToRefresh ? indicatorScale : 0,
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
        className={`screen flex flex-col items-stretch justify-start h-full w-full max-w-[798px] mx-auto ${className}`.trim()}
        style={{
          /* Без translate на корне, если PT выключен: иначе `position:fixed` у порталов/dnd
             DragOverlay считается от wrong containing block и «плывёт» относительно курсора */
          ...(enablePullToRefresh ? { y: springY } : {}),
          ...(bottomInset === 'safe' && {
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
          }),
        }}
      >
        {loading ? <PageLoader /> : children}
      </motion.div>
    </>
  );
}
