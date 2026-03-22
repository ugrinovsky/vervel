import { useState, useEffect, useRef, useCallback, RefObject } from 'react';

const PAGE_SIZE = 24;

/**
 * Client-side infinite scroll for pre-loaded arrays.
 * Uses a callback ref so the observer is set up exactly when the sentinel
 * enters the DOM (which may be after the data loads).
 *
 * @param items     - full filtered array (already in memory)
 * @param resetKey  - string that changes when filters/search change; resets to page 1
 * @param scrollRef - optional ref to the scroll container (pass when scroll happens inside
 *                    a div, not the document — e.g. BottomSheet inner scroll div)
 */
export function useInfiniteScroll<T>(
  items: T[],
  resetKey: string,
  scrollRef?: RefObject<HTMLElement | null>,
) {
  const [count, setCount] = useState(PAGE_SIZE);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Reset to first page when filters change
  useEffect(() => {
    setCount(PAGE_SIZE);
  }, [resetKey]);

  // Callback ref: fires when sentinel mounts/unmounts, not on every render
  const sentinelRef = useCallback(
    (el: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;

      if (!el) return;

      const root = scrollRef?.current ?? null;
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setCount((c) => c + PAGE_SIZE);
          }
        },
        { root, rootMargin: '100px', threshold: 0 },
      );
      observerRef.current.observe(el);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return {
    visible: items.slice(0, count),
    sentinelRef,
    hasMore: count < items.length,
  };
}
