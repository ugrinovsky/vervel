import { useRef, useCallback, useLayoutEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import { leadChipToneClasses } from '@/components/ui/leadChipStyles';
import {
  chipScrollActiveClass,
  chipScrollColoredActiveFallback,
  chipScrollColoredInactiveFallback,
  chipScrollInactiveClass,
  type ChipScrollItem,
} from '@/components/ui/chipScrollRowStyles';

function makeMask(atStart: boolean, atEnd: boolean): string {
  if (atStart && atEnd) return 'none';
  if (atStart) return 'linear-gradient(to right, black calc(100% - 32px), transparent 100%)';
  if (atEnd) return 'linear-gradient(to right, transparent 0px, black 32px)';
  return 'linear-gradient(to right, transparent 0px, black 32px, black calc(100% - 32px), transparent 100%)';
}

function useScrollMask(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  const update = useCallback(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    const atStart = el.scrollLeft <= 2;
    const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2;
    const mask = makeMask(atStart, atEnd);
    el.style.maskImage = mask;
    el.style.setProperty('-webkit-mask-image', mask);
  }, [enabled]);

  useLayoutEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
      el.style.maskImage = '';
      el.style.removeProperty('-webkit-mask-image');
    };
  }, [enabled, update]);

  return ref;
}

const CHIP_LAYOUT =
  'group/chip inline-flex min-w-0 items-center justify-center gap-1.5 shrink-0 rounded-full text-xs font-medium border touch-manipulation select-none transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-200 ease-in-out [-webkit-tap-highlight-color:transparent] active:opacity-100! active:filter-none!';

/**
 * Горизонтальный ряд чипов.
 * `colored` — цветные фоны на каждом чипе, без sliding pill.
 * `edgeFade` — градиент по краям при горизонтальном скролле (работает и с colored).
 */
export default function ChipScrollRow({
  chips,
  activeKey,
  onChipClick,
  disabled = false,
  className = '',
  pillClassName,
  edgeFade = false,
  colored = false,
}: {
  chips: ChipScrollItem[];
  activeKey: string | null;
  onChipClick: (key: string) => void;
  disabled?: boolean;
  className?: string;
  pillClassName?: string | ((activeKey: string | null) => string);
  edgeFade?: boolean;
  colored?: boolean;
}) {
  const isColoredMode =
    colored ||
    chips.some(
      (c) => c.tone != null || c.inactiveClass != null || c.activeClass != null,
    );
  const usePillMode = !isColoredMode;
  const useEdgeFade = edgeFade;

  const activeChip = chips.find((c) => c.key === activeKey);
  const useSlidingPill = usePillMode && Boolean(activeChip && !activeChip.activeClass);

  const resolvedPillClass =
    typeof pillClassName === 'function'
      ? pillClassName(activeKey)
      : (pillClassName ?? 'bg-(--color_primary_light)');

  const scrollRef = useScrollMask(useEdgeFade);
  const plainRef = useRef<HTMLDivElement>(null);
  const rowRef = useEdgeFade ? scrollRef : plainRef;
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!useSlidingPill) return;
    const activeBtn = btnRefs.current.get(activeKey ?? '__none__');
    if (!activeBtn) {
      setPill((prev) => (prev == null ? prev : null));
      return;
    }
    const next = { left: activeBtn.offsetLeft, width: activeBtn.offsetWidth };
    setPill((prev) =>
      prev?.left === next.left && prev?.width === next.width ? prev : next,
    );
  }, [activeKey, useSlidingPill, chips.length]);

  const toneFor = (chip: ChipScrollItem, isActive: boolean) => {
    if (isColoredMode) {
      if (chip.tone != null || chip.inactiveClass != null || chip.activeClass != null) {
        return leadChipToneClasses(chip.tone, isActive, {
          inactiveClass: chip.inactiveClass,
          activeClass: chip.activeClass,
        });
      }
      return isActive ? chipScrollColoredActiveFallback : chipScrollColoredInactiveFallback;
    }
    return isActive
      ? (chip.activeClass ?? chipScrollActiveClass)
      : (chip.inactiveClass ?? chipScrollInactiveClass);
  };

  return (
    <div
      ref={rowRef}
      className={`relative flex gap-2 overflow-x-auto no-scrollbar ${className}`.trim()}
    >
      {useSlidingPill && pill && (
        <motion.div
          className={`absolute top-0 bottom-0.5 z-0 rounded-full pointer-events-none ${resolvedPillClass}`}
          initial={false}
          animate={{ left: pill.left, width: pill.width }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        />
      )}

      {chips.map((chip) => {
        const { key, label, onClear } = chip;
        const isActive = activeKey === key;
        const tone = toneFor(chip, isActive);

        if (onClear) {
          return (
            <div
              key={key}
              className={`relative z-10 inline-flex min-w-0 shrink-0 gap-0 rounded-full pr-1 border ${tone} ${
                disabled ? 'opacity-50' : ''
              }`}
            >
              <Button
                type="button"
                variant="unstyled"
                disabled={disabled}
                aria-pressed={isActive}
                onClick={() => onChipClick(key)}
                className={`${CHIP_LAYOUT} min-w-0 flex-1 px-3 py-1.5 rounded-l-full text-left font-medium z-10 border-0 bg-transparent shadow-none`}
              >
                {label}
              </Button>
              <Button
                type="button"
                variant="unstyled"
                disabled={disabled}
                aria-label="Сбросить"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!disabled) onClear();
                }}
                className={`${CHIP_LAYOUT} relative z-20 size-7 border border-(--color_border) bg-(--color_bg_card_hover) text-(--color_text_muted) hover:bg-(--color_bg_card) hover:text-(--color_text_primary) disabled:pointer-events-none`}
              >
                <XMarkIcon className="size-3.5 shrink-0 stroke-2" />
              </Button>
            </div>
          );
        }

        return (
          <Button
            key={key}
            type="button"
            variant="unstyled"
            ref={(el) => {
              if (el) btnRefs.current.set(key, el);
              else btnRefs.current.delete(key);
            }}
            disabled={disabled}
            aria-pressed={isActive}
            onClick={() => onChipClick(key)}
            className={`${CHIP_LAYOUT} relative px-3 py-1.5 z-10 disabled:opacity-50 ${tone}`}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
