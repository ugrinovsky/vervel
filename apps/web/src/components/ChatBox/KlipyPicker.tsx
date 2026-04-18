import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { chatApi, type KlipyCategory, type KlipyKind, type KlipySearchItem } from '@/api/chat';
import CloseButton from '@/components/ui/CloseButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SearchInput from '@/components/ui/SearchInput';
import ChipScrollRow, { type ChipScrollItem } from '@/components/ui/ChipScrollRow';
import { klipyCategoryLabelRu } from '@/util/klipyCategoryRu';
import { loadKlipyRecent, pushKlipyRecent, removeKlipyRecentById } from '@/util/klipyRecent';

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (item: KlipySearchItem) => void | Promise<void>;
  pickDisabled?: boolean;
};

/** Размер страницы поиска (первая загрузка и «Ещё»). */
const KLIPY_GRID_PAGE_SIZE = 24;

/** Тематические подборки под Vervel (поиск GIF тем же `/search?q=…`). */
type VervelKlipyThemeChip = { key: string; label: string; q: string };

type VervelKlipyThemeGroup = { title: string; chips: readonly VervelKlipyThemeChip[] };

const VERVEL_KLIPY_THEME_GROUPS: readonly VervelKlipyThemeGroup[] = [
  {
    title: 'Тренировка',
    chips: [
      { key: '__v:gym', label: 'В зале', q: 'gym workout' },
      { key: '__v:home', label: 'Дома', q: 'home workout' },
      { key: '__v:cardio', label: 'Кардио', q: 'cardio running' },
      { key: '__v:stretch', label: 'Растяжка', q: 'stretching yoga' },
      { key: '__v:weights', label: 'С железом', q: 'weightlifting barbell' },
    ],
  },
  {
    title: 'Цели и результат',
    chips: [
      { key: '__v:win', label: 'Победа', q: 'victory celebration sports' },
      { key: '__v:pr', label: 'Рекорд', q: 'personal best achievement' },
      { key: '__v:team', label: 'Команда', q: 'team sports high five' },
      { key: '__v:medal', label: 'Награда', q: 'medal trophy winner' },
    ],
  },
  {
    title: 'Настроение',
    chips: [
      { key: '__v:motivate', label: 'Вперёд', q: 'motivation fitness' },
      { key: '__v:fire', label: 'Рвём', q: 'beast mode gym intense' },
      { key: '__v:tired', label: 'Устал', q: 'exhausted tired workout' },
      { key: '__v:sleep', label: 'Восстановление', q: 'sleep rest recovery' },
    ],
  },
  {
    title: 'Питание и быт',
    chips: [
      { key: '__v:food', label: 'Еда', q: 'healthy meal protein' },
      { key: '__v:water', label: 'Вода', q: 'drinking water hydration' },
      { key: '__v:coffee', label: 'Кофе', q: 'coffee morning energy' },
    ],
  },
] as const;

const VERVEL_KLIPY_THEME_CHIPS_FLAT: VervelKlipyThemeChip[] =
  VERVEL_KLIPY_THEME_GROUPS.flatMap((g) => g.chips.map((c) => ({ ...c })));

function packKlipyItemsIntoColumns(
  items: KlipySearchItem[],
  columnCount: number
): KlipySearchItem[][] {
  if (columnCount < 1) return [items];
  const cols: KlipySearchItem[][] = Array.from({ length: columnCount }, () => []);
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

function klipyTileAspectStyle(item: KlipySearchItem): { aspectRatio: string } {
  const { previewWidth: w, previewHeight: h } = item;
  if (w && h && w > 0 && h > 0) {
    return { aspectRatio: `${Math.round(w)} / ${Math.round(h)}` };
  }
  return { aspectRatio: '1 / 1' };
}

function KlipyPickerTile({
  item,
  disabled,
  picking,
  onPick,
  showRemoveFromRecent,
  onRemoveFromRecent,
}: {
  item: KlipySearchItem;
  disabled: boolean;
  picking: boolean;
  onPick: (item: KlipySearchItem) => void | Promise<void>;
  showRemoveFromRecent?: boolean;
  onRemoveFromRecent?: (item: KlipySearchItem) => void;
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
        style={klipyTileAspectStyle(item)}
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

export default function KlipyPicker({ open, onClose, onPick, pickDisabled }: Props) {
  const [kind, setKind] = useState<KlipyKind>('gif');
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriesByKind, setCategoriesByKind] = useState<Record<KlipyKind, KlipyCategory[]>>({
    gif: [],
    sticker: [],
  });
  const categories = categoriesByKind[kind];
  const [selectedCat, setSelectedCat] = useState<KlipyCategory | null>(null);
  const [showRecentGrid, setShowRecentGrid] = useState(false);
  const [recentItems, setRecentItems] = useState<KlipySearchItem[]>([]);
  const [items, setItems] = useState<KlipySearchItem[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pickingId, setPickingId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
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
    setRecentItems(loadKlipyRecent(kind));
  }, [open, kind]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => setSearchTerm(query.trim()), 320);
    return () => window.clearTimeout(id);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    chatApi
      .listKlipyCategories({ kind })
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
          kind: KlipyKind;
          q?: string;
          category?: string;
          tag?: string;
        } = { offset: 0, limit: KLIPY_GRID_PAGE_SIZE, kind };
        if (searchTerm.length > 0) params.q = searchTerm;
        else if (selectedCat?.defaultTagEncoded) {
          params.category = selectedCat.name_encoded;
          params.tag = selectedCat.defaultTagEncoded;
        } else if (selectedCat) params.q = selectedCat.name;
        const res = await chatApi.searchKlipy(params);
        if (cancelled) return;
        setItems(res.data.data.items);
        setNextOffset(res.data.data.nextOffset);
      } catch (err: unknown) {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        toast.error(status === 503 ? 'GIF сейчас недоступны' : 'Не удалось загрузить GIF');
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
        kind: KlipyKind;
        q?: string;
        category?: string;
        tag?: string;
      } = { offset: nextOffset, limit: KLIPY_GRID_PAGE_SIZE, kind };
      if (searchTerm.length > 0) params.q = searchTerm;
      else if (selectedCat?.defaultTagEncoded) {
        params.category = selectedCat.name_encoded;
        params.tag = selectedCat.defaultTagEncoded;
      } else if (selectedCat) params.q = selectedCat.name;
      const res = await chatApi.searchKlipy(params);
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
  }, [nextOffset, loadingMore, loading, searchTerm, kind, selectedCat, showRecentGrid]);

  useLayoutEffect(() => {
    const top = pendingScrollRestoreRef.current;
    if (top === null) return;
    pendingScrollRestoreRef.current = null;
    const el = scrollAreaRef.current;
    if (el) el.scrollTop = top;
  }, [items.length]);

  const handlePick = async (item: KlipySearchItem) => {
    if (pickDisabled || pickingId) return;
    setPickingId(item.id);
    try {
      await onPick(item);
      setRecentItems(pushKlipyRecent(kind, item));
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

  const clearSearch = useCallback(() => {
    setQuery('');
    setSearchTerm('');
  }, []);

  const onQueryChange = (v: string) => {
    setQuery(v);
    if (v.trim().length > 0) {
      setSelectedCat(null);
      setShowRecentGrid(false);
    }
  };

  const handleRemoveFromRecent = useCallback(
    (item: KlipySearchItem) => {
      const next = removeKlipyRecentById(kind, item.id);
      setRecentItems(next);
      if (next.length === 0) setShowRecentGrid(false);
    },
    [kind]
  );

  const categoryChips: ChipScrollItem[] = useMemo(() => {
    const rows: ChipScrollItem[] = [];
    if (recentItems.length > 0) {
      rows.push({
        key: '__recent__',
        label: <span className="max-w-[120px] truncate">Недавние</span>,
      });
    }
    /** Тренды KLIPY для GIF и стикеров (на бэке — отдельный эндпоинт trending). */
    rows.push({ key: '__trends__', label: 'Популярное' });
    for (const group of VERVEL_KLIPY_THEME_GROUPS) {
      for (const tc of group.chips) {
        rows.push({
          key: tc.key,
          label: <span className="max-w-[120px] truncate">{tc.label}</span>,
        });
      }
    }
    for (const c of categories) {
      rows.push({
        key: c.name_encoded,
        label: (
          <span className="max-w-[140px] truncate">
            {klipyCategoryLabelRu(c.name_encoded, c.name)}
          </span>
        ),
      });
    }
    return rows;
  }, [kind, categories, recentItems]);

  const categoryActiveKey = useMemo(() => {
    if (showRecentGrid) return '__recent__';
    const quickHit = VERVEL_KLIPY_THEME_CHIPS_FLAT.find((c) => c.q === searchTerm);
    if (quickHit) return quickHit.key;
    if (searchTerm.length > 0) return null;
    if (!selectedCat) return '__trends__';
    return selectedCat.name_encoded;
  }, [searchTerm, selectedCat, showRecentGrid]);

  const onCategoryChipClick = useCallback(
    (key: string) => {
      if (key === '__recent__') {
        clearSearch();
        setShowRecentGrid(true);
        setSelectedCat(null);
        return;
      }
      if (key === '__trends__') {
        clearSearch();
        setShowRecentGrid(false);
        setSelectedCat(null);
        return;
      }
      const quick = VERVEL_KLIPY_THEME_CHIPS_FLAT.find((c) => c.key === key);
      if (quick) {
        setShowRecentGrid(false);
        setSelectedCat(null);
        setQuery(quick.q);
        setSearchTerm(quick.q);
        return;
      }
      setShowRecentGrid(false);
      clearSearch();
      const c = categories.find((x) => x.name_encoded === key);
      if (c) setSelectedCat(c);
    },
    [categories, clearSearch]
  );

  const [gridCols, setGridCols] = useState(
    () => (typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches ? 4 : 3)
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 640px)');
    const sync = () => setGridCols(mq.matches ? 4 : 3);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const itemColumns = useMemo(() => packKlipyItemsIntoColumns(items, gridCols), [items, gridCols]);
  if (!open) return null;

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
                clearSearch();
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
                clearSearch();
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
            placeholder="Поиск в KLIPY…"
          />
          <CloseButton onClick={onClose} className="!w-9 !h-9" iconClassName="w-[18px] h-[18px]" />
        </div>
        <ChipScrollRow
          className="pr-2.5 sm:pr-3"
          chips={categoryChips}
          activeKey={categoryActiveKey}
          onChipClick={onCategoryChipClick}
        />
      </div>
      <div ref={scrollAreaRef} className="min-w-0 flex-1 min-h-0 overflow-y-auto px-3 py-3">
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
                  <KlipyPickerTile
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
          href="https://klipy.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] tracking-wide text-(--color_text_muted)/70 hover:text-white/50 inline-block py-0.5"
        >
          Powered by KLIPY
        </a>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(overlay, document.body) : null;
}
