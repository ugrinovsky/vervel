import {
  useRef,
  useCallback,
  useLayoutEffect,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

function makeMask(atStart: boolean, atEnd: boolean): string {
  if (atStart && atEnd) return 'none';
  if (atStart) return 'linear-gradient(to right, black calc(100% - 32px), transparent 100%)';
  if (atEnd) return 'linear-gradient(to right, transparent 0px, black 32px)';
  return 'linear-gradient(to right, transparent 0px, black 32px, black calc(100% - 32px), transparent 100%)';
}

function useScrollMask() {
  const ref = useRef<HTMLDivElement>(null);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const atStart = el.scrollLeft <= 2;
    const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2;
    const mask = makeMask(atStart, atEnd);
    el.style.maskImage = mask;
    ;(el.style as unknown as { webkitMaskImage?: string }).webkitMaskImage = mask;
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
      mo.disconnect();
    };
  }, [update]);

  return ref;
}

export type ChipScrollItem = {
  key: string;
  label: ReactNode;
  /** Кнопка сброса справа (отдельная от основного клика по чипу). */
  onClear?: () => void;
};

/**
 * Горизонтальный ряд чипов: градиентная маска по краям, скользящая «таблетка» под активным.
 * Как ряд категорий / зон в ExerciseFilterBar.
 */
export default function ChipScrollRow({
  chips,
  activeKey,
  onChipClick,
  disabled = false,
  className = '',
}: {
  chips: ChipScrollItem[];
  activeKey: string | null;
  onChipClick: (key: string) => void;
  disabled?: boolean;
  /** Доп. классы на контейнер скролла (например `pr-3 pb-2` под полосу скролла). */
  className?: string;
}) {
  const rowRef = useScrollMask();
  const btnRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const activeBtn = btnRefs.current.get(activeKey ?? '__none__');
    if (!activeBtn) {
      setPill(null);
      return;
    }
    setPill({ left: activeBtn.offsetLeft, width: activeBtn.offsetWidth });
  }, [activeKey, chips]);

  useEffect(() => {
    const activeBtn = btnRefs.current.get(activeKey ?? '__none__');
    activeBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeKey]);

  return (
    <div
      ref={rowRef}
      className={`relative flex gap-2 overflow-x-auto no-scrollbar ${className}`.trim()}
    >
      {pill && (
        <motion.div
          className="absolute top-0 bottom-0.5 z-[1] rounded-full bg-(--color_primary_light) pointer-events-none"
          initial={{ left: pill.left, width: pill.width }}
          animate={{ left: pill.left, width: pill.width }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        />
      )}

      {chips.map(({ key, label, onClear }) => {
        const tone = (active: boolean) =>
          active
            ? 'text-[white] border-transparent'
            : 'bg-black/25 text-[white] border-white/10 hover:bg-black/35 hover:border-white/20';

        if (onClear) {
          const active = activeKey === key;
          return (
            <div
              key={key}
              ref={(el) => {
                if (el) btnRefs.current.set(key, el);
                else btnRefs.current.delete(key);
              }}
              className={`relative z-10 inline-flex min-w-0 items-center shrink-0 gap-0 rounded-full pr-1 text-xs font-medium border outline-none transition-colors ${
                disabled ? 'opacity-50' : ''
              } ${tone(active)}`}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChipClick(key)}
                className="min-w-0 flex-1 px-3 py-1.5 rounded-l-full text-left font-medium outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-inset"
              >
                {label}
              </button>
              <button
                type="button"
                disabled={disabled}
                aria-label="Сбросить"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!disabled) onClear();
                }}
                className="relative z-20 flex size-7 shrink-0 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white hover:bg-black/65 disabled:pointer-events-none"
              >
                <XMarkIcon className="size-3.5 shrink-0 stroke-2" />
              </button>
            </div>
          );
        }

        return (
          <button
            key={key}
            type="button"
            ref={(el) => {
              if (el) btnRefs.current.set(key, el);
              else btnRefs.current.delete(key);
            }}
            disabled={disabled}
            onClick={() => onChipClick(key)}
            className={`relative inline-flex min-w-0 items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border outline-none z-10 transition-colors disabled:opacity-50 ${tone(
              activeKey === key
            )}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
