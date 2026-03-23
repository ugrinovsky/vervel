import { useState, useRef, useCallback } from 'react';

/**
 * Generic hook for paginated infinite scroll.
 * Supports both "prepend older" (chats scroll-up) and "append older" (lists scroll-down) modes.
 *
 * Usage:
 *   const { items, loading, hasMore, initialize, loadMore } = useServerPagination(
 *     (offset, limit) => api.fetchPage(offset, limit),
 *     { limit: 20, mode: 'append' }
 *   );
 */
export function useServerPagination<T>(
  fetcher: (offset: number, limit: number) => Promise<T[]>,
  { limit = 20, mode = 'append' }: { limit?: number; mode?: 'prepend' | 'append' } = {}
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);
  const lockedRef = useRef(false);

  /** Initial load — replaces items, resets offset. */
  const initialize = useCallback(async () => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setLoading(true);
    try {
      const data = await fetcher(0, limit);
      setItems(data);
      offsetRef.current = data.length;
      setHasMore(data.length >= limit);
    } finally {
      setLoading(false);
      lockedRef.current = false;
    }
  }, [fetcher, limit]);

  /**
   * Load next page and prepend/append to items.
   * Returns number of items loaded (0 if nothing new or locked).
   */
  const loadMore = useCallback(async (): Promise<number> => {
    if (lockedRef.current || !hasMore) return 0;
    lockedRef.current = true;
    setLoading(true);
    try {
      const data = await fetcher(offsetRef.current, limit);
      offsetRef.current += data.length;
      if (data.length < limit) setHasMore(false);
      if (data.length > 0) {
        if (mode === 'prepend') {
          setItems((prev) => [...data, ...prev]);
        } else {
          setItems((prev) => [...prev, ...data]);
        }
      }
      return data.length;
    } finally {
      setLoading(false);
      lockedRef.current = false;
    }
  }, [hasMore, mode, fetcher, limit]);

  /** Manually replace items (e.g. after sending a new message). */
  const setItemsManual = useCallback((updater: T[] | ((prev: T[]) => T[])) => {
    setItems(updater);
  }, []);

  return { items, setItems: setItemsManual, loading, hasMore, initialize, loadMore };
}
