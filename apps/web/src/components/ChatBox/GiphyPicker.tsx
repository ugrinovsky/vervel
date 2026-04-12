import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { chatApi, type GiphyCategory, type GiphyKind, type GiphySearchItem } from '@/api/chat';
import CloseButton from '@/components/ui/CloseButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SearchInput from '@/components/ui/SearchInput';
import ChipScrollRow, { type ChipScrollItem } from '@/components/ui/ChipScrollRow';
import { giphyCategoryLabelRu } from '@/util/giphyCategoryRu';
import { loadGiphyRecent, pushGiphyRecent, removeGiphyRecentById } from '@/util/giphyRecent';

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (item: GiphySearchItem) => void | Promise<void>;
  pickDisabled?: boolean;
};

/** Размер страницы поиска GIPHY (первая и «Ещё»). */
const GIPHY_GRID_PAGE_SIZE = 24;

/** Раскладка «masonry» без CSS column-count (внутри scroll ломается в 1 колонку). */
function packGiphyItemsIntoColumns(
  items: GiphySearchItem[],
  columnCount: number
): GiphySearchItem[][] {
  if (columnCount < 1) return [items];
  const cols: GiphySearchItem[][] = Array.from({ length: columnCount }, () => []);
  const load = new Array(columnCount).fill(0);
  for (const item of items) {
    const w = item.previewWidth;
    const h = item.previewHeight;
    const unit =
      typeof w === 'number' && typeof h === 'number' && w > 0 && h > 0 ? h / w : 1;
    let minK = 0;
    for (let j = 1; j < columnCount; j++) {
      if (load[j] < load[minK]) minK = j;
    }
    cols[minK].push(item);
    load[minK] += unit;
  }
  return cols;
}

function giphyTileAspectStyle(item: GiphySearchItem): { aspectRatio: string } {
  const { previewWidth: w, previewHeight: h } = item;
  if (w && h && w > 0 && h > 0) {
    return { aspectRatio: `${Math.round(w)} / ${Math.round(h)}` };
  }
  return { aspectRatio: '1 / 1' };
}

function GiphyPickerTile({
  item,
  disabled,
  picking,
  onPick,
  showRemoveFromRecent,
  onRemoveFromRecent,
}: {
  item: GiphySearchItem;
  disabled: boolean;
  picking: boolean;
  onPick: (item: GiphySearchItem) => void | Promise<void>;
  showRemoveFromRecent?: boolean;
  onRemoveFromRecent?: (item: GiphySearchItem) => void;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [item.id, item.previewUrl]);

  const w = item.previewWidth;
  const h = item.previewHeight;
  const hasDims = typeof w === 'number' && typeof h === 'number' && w > 0 && h > 0;
  const iw = hasDims ? Math.round(w) : undefined;
  const ih = hasDims ? Math.round(h) : undefined;

  return (
    <div className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => void onPick(item)}
        className="relative w-full rounded-lg overflow-hidden bg-white/5 border border-white/10 active:scale-[0.98] transition-transform disabled:opacity-50"
        style={giphyTileAspectStyle(item)}
      >
        <img
          src={item.previewUrl}
          alt=""
          width={iw}
          height={ih}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-200 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {picking && (
          <div className="absolute inset-0 z-[2] flex items-center justify-center bg-black/50">
            <LoadingSpinner size="md" variant="light" />
          </div>
        )}
      </button>
      {showRemoveFromRecent && onRemoveFromRecent && (
        <button
          type="button"
          aria-label="Убрать из недавних"
          disabled={disabled || picking}
          className="absolute right-1.5 top-1.5 z-[4] flex size-8 items-center justify-center rounded-full border border-white/50 bg-black/75 text-white shadow-md backdrop-blur-sm hover:bg-black/90 disabled:pointer-events-none disabled:opacity-40"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled && !picking) onRemoveFromRecent(item);
          }}
        >
          <XMarkIcon className="size-[18px] shrink-0 stroke-2" />
        </button>
      )}
    </div>
  );
}

export default function GiphyPicker({ open, onClose, onPick, pickDisabled }: Props) {
  const [kind, setKind] = useState<GiphyKind>('gif');
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  /** Отдельно по kind — иначе при переключении GIF→стикеры кратко видны чужие чипы. */
  const [categoriesByKind, setCategoriesByKind] = useState<Record<GiphyKind, GiphyCategory[]>>({
    gif: [],
    sticker: [],
  });
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const categories = categoriesByKind[kind];
  const [selectedCat, setSelectedCat] = useState<GiphyCategory | null>(null);
  /** Локальная сетка «недавние» без запроса к API */
  const [showRecentGrid, setShowRecentGrid] = useState(false);
  const [recentItems, setRecentItems] = useState<GiphySearchItem[]>([]);
  const [items, setItems] = useState<GiphySearchItem[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pickingId, setPickingId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  /** После «Ещё» вернуть scrollTop (колонки / фокус кнопки). */
  const pendingScrollRestoreRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSearchTerm('');
    setSelectedCat(null);
    setShowRecentGrid(false);
    setKind('gif');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setRecentItems(loadGiphyRecent(kind));
  }, [open, kind]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => setSearchTerm(query.trim()), 320);
    return () => window.clearTimeout(id);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCategoriesLoading(true);
    chatApi
      .listGiphyCategories({ kind })
      .then((res) => {
        if (!cancelled) {
          const next = res.data.data.categories ?? [];
          setCategoriesByKind((prev) => ({ ...prev, [kind]: next }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Не удалось загрузить категории');
          setCategoriesByKind((prev) => ({ ...prev, [kind]: [] }));
        }
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, kind]);

  useEffect(() => {
    if (!open) return;

    if (showRecentGrid) {
      if (recentItems.length === 0) {
        setShowRecentGrid(false);
        return;
      }
      setLoading(false);
      setItems(recentItems);
      setNextOffset(null);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setItems([]);
    setNextOffset(null);

    (async () => {
      try {
        const params: {
          offset: number;
          limit: number;
          kind: GiphyKind;
          q?: string;
          category?: string;
          tag?: string;
        } = { offset: 0, limit: GIPHY_GRID_PAGE_SIZE, kind };

        if (searchTerm.length > 0) {
          params.q = searchTerm;
        } else if (selectedCat?.defaultTagEncoded) {
          params.category = selectedCat.name_encoded;
          params.tag = selectedCat.defaultTagEncoded;
        } else if (selectedCat) {
          params.q = selectedCat.name;
        }
        // иначе — тренды (без q / category)

        const res = await chatApi.searchGiphy(params);
        if (cancelled) return;
        setItems(res.data.data.items);
        setNextOffset(res.data.data.nextOffset);
      } catch (err: unknown) {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 503) {
          toast.error('GIF сейчас недоступны');
        } else {
          toast.error('Не удалось загрузить GIF');
        }
        setItems([]);
        setNextOffset(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, searchTerm, kind, selectedCat, showRecentGrid, recentItems]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const loadMore = useCallback(async () => {
    if (showRecentGrid || nextOffset === null || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const params: {
        offset: number;
        limit: number;
        kind: GiphyKind;
        q?: string;
        category?: string;
        tag?: string;
      } = { offset: nextOffset, limit: GIPHY_GRID_PAGE_SIZE, kind };

      if (searchTerm.length > 0) {
        params.q = searchTerm;
      } else if (selectedCat?.defaultTagEncoded) {
        params.category = selectedCat.name_encoded;
        params.tag = selectedCat.defaultTagEncoded;
      } else if (selectedCat) {
        params.q = selectedCat.name;
      }
      // иначе — тренды

      const res = await chatApi.searchGiphy(params);
      const batch = res.data.data.items;
      if (batch.length > 0) {
        const scrollEl = scrollAreaRef.current;
        if (scrollEl) pendingScrollRestoreRef.current = scrollEl.scrollTop;
      }
      setItems((prev) => [...prev, ...batch]);
      setNextOffset(res.data.data.nextOffset);
    } catch {
      toast.error('Не удалось загрузить ещё GIF');
    } finally {
      setLoadingMore(false);
    }
  }, [
    nextOffset,
    loadingMore,
    loading,
    searchTerm,
    kind,
    selectedCat,
    showRecentGrid,
  ]);

  useLayoutEffect(() => {
    const top = pendingScrollRestoreRef.current;
    if (top === null) return;
    pendingScrollRestoreRef.current = null;
    const el = scrollAreaRef.current;
    if (el) el.scrollTop = top;
  }, [items.length]);

  const handlePick = async (item: GiphySearchItem) => {
    if (pickDisabled || pickingId) return;
    setPickingId(item.id);
    try {
      await onPick(item);
      setRecentItems(pushGiphyRecent(kind, item));
      onClose();
    } catch {
      toast.error('Не удалось отправить GIF');
    } finally {
      setPickingId(null);
    }
  };

  const clearFilters = () => {
    setSelectedCat(null);
    setShowRecentGrid(false);
  };

  const onQueryChange = (v: string) => {
    setQuery(v);
    if (v.trim().length > 0) {
      setSelectedCat(null);
      setShowRecentGrid(false);
    }
  };

  const handleRemoveFromRecent = useCallback((item: GiphySearchItem) => {
    const next = removeGiphyRecentById(kind, item.id);
    setRecentItems(next);
    if (next.length === 0) setShowRecentGrid(false);
  }, [kind]);

  const categoriesChipsDisabled = categoriesLoading && categories.length === 0;

  const categoryChips: ChipScrollItem[] = useMemo(() => {
    const rows: ChipScrollItem[] = [];
    if (recentItems.length > 0) {
      rows.push({
        key: '__recent__',
        label: <span className="max-w-[120px] truncate">Недавние</span>,
      });
    }
    if (kind === 'gif') rows.push({ key: '__trends__', label: 'Тренды' });
    for (const c of categories) {
      rows.push({
        key: c.name_encoded,
        label: (
          <span className="max-w-[140px] truncate">{giphyCategoryLabelRu(c.name_encoded, c.name)}</span>
        ),
      });
    }
    return rows;
  }, [kind, categories, recentItems]);

  const categoryActiveKey = useMemo(() => {
    if (searchTerm) return null;
    if (showRecentGrid) return '__recent__';
    if (kind === 'gif' && !selectedCat) return '__trends__';
    if (selectedCat) return selectedCat.name_encoded;
    return null;
  }, [searchTerm, kind, selectedCat, showRecentGrid]);

  const onCategoryChipClick = useCallback((key: string) => {
    if (key === '__recent__') {
      setShowRecentGrid(true);
      setSelectedCat(null);
      return;
    }
    if (key === '__trends__') {
      setShowRecentGrid(false);
      setSelectedCat(null);
      return;
    }
    setShowRecentGrid(false);
    const c = categories.find((x) => x.name_encoded === key);
    if (c) setSelectedCat(c);
  }, [categories]);

  const [gridCols, setGridCols] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches ? 4 : 3
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 640px)');
    const sync = () => setGridCols(mq.matches ? 4 : 3);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const itemColumns = useMemo(
    () => packGiphyItemsIntoColumns(items, gridCols),
    [items, gridCols]
  );

  if (!open) return null;

  /** Портал + fixed: иначе оверлей остаётся в слое ChatBox (z-10) и рисуется под шапкой шита (z-20). */
  const overlay = (
    <div
      className="fixed inset-0 z-[270] flex flex-col bg-black/75 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Выбор GIF"
    >
      <div className="shrink-0 px-3 pt-[max(12px,env(safe-area-inset-top))] pb-2 border-b border-white/10 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-white/10 border border-white/15 p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setKind('gif');
                clearFilters();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                kind === 'gif' ? 'bg-white/20 text-white' : 'text-white/50'
              }`}
            >
              GIF
            </button>
            <button
              type="button"
              onClick={() => {
                setKind('sticker');
                clearFilters();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                kind === 'sticker' ? 'bg-white/20 text-white' : 'text-white/50'
              }`}
            >
              Стикеры
            </button>
          </div>
          <SearchInput
            dense
            className="flex-1 min-w-0"
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              const q = e.currentTarget.value.trim();
              setSearchTerm(q);
              e.currentTarget.blur();
            }}
            onClear={() => {
              clearFilters();
              setQuery('');
              setSearchTerm('');
            }}
            placeholder="Поиск в GIPHY…"
          />
          <CloseButton onClick={onClose} className="!w-9 !h-9" iconClassName="w-[18px] h-[18px]" />
        </div>

        {(kind === 'gif' || categories.length > 0 || recentItems.length > 0) && (
          <ChipScrollRow
            className="pr-2.5 sm:pr-3"
            chips={categoryChips}
            activeKey={categoryActiveKey}
            onChipClick={onCategoryChipClick}
            disabled={categoriesChipsDisabled}
          />
        )}
      </div>

      <div
        ref={scrollAreaRef}
        className="min-w-0 flex-1 min-h-0 overflow-y-auto px-3 py-3"
      >
        {loading && items.length === 0 ? (
          <div
            className="flex items-center justify-center py-16 min-h-[40vh]"
            aria-busy
            aria-label="Загрузка GIF"
          >
            <LoadingSpinner />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-(--color_text_muted) py-12">Ничего не найдено</p>
        ) : (
          <div className="flex min-w-0 gap-1.5">
            {itemColumns.map((colItems, colIdx) => (
              <div key={colIdx} className="flex min-w-0 flex-1 flex-col gap-1.5">
                {colItems.map((item) => (
                  <GiphyPickerTile
                    key={item.id}
                    item={item}
                    disabled={pickDisabled || !!pickingId}
                    picking={pickingId === item.id}
                    onPick={handlePick}
                    showRemoveFromRecent={showRecentGrid}
                    onRemoveFromRecent={handleRemoveFromRecent}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {nextOffset !== null && !loading && items.length > 0 && (
          <div className="flex justify-center pt-4 pb-2">
            <button
              type="button"
              disabled={loadingMore}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void loadMore()}
              className="text-sm text-(--color_primary_icon) font-medium py-2 px-4 rounded-xl bg-white/5 border border-white/10 disabled:opacity-50"
            >
              {loadingMore ? 'Загрузка…' : 'Ещё'}
            </button>
          </div>
        )}
      </div>

      <div className="shrink-0 px-3 pb-[max(6px,env(safe-area-inset-bottom))] pt-1 border-t border-white/10 text-center leading-none">
        <a
          href="https://giphy.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] tracking-wide text-(--color_text_muted)/70 hover:text-white/50 inline-block py-0.5"
        >
          Powered by GIPHY
        </a>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(overlay, document.body) : null;
}
