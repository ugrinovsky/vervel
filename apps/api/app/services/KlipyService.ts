import env from '#start/env'

export type KlipyKind = 'gif' | 'sticker'

export type KlipySearchItem = {
  id: string
  previewUrl: string
  url: string
  previewWidth?: number
  previewHeight?: number
}

export type KlipyCategoryDto = {
  name: string
  name_encoded: string
  defaultTagEncoded: string | null
  categoryPreviewUrl: string | null
}

/** Nested `file` object from KLIPY (see community examples; also accept `files`). */
type KlipyFileNode = {
  url?: string
  width?: number
  height?: string | number
}

type KlipyApiItem = {
  id?: string
  slug?: string
  title?: string
  file?: Record<string, unknown>
  files?: Record<string, unknown>
  /** В ответах встречается и так (см. docs / сторонние клиенты). */
  media?: Record<string, unknown>
}

type KlipyApiCategory = {
  name?: string
  title?: string
  name_encoded?: string
  slug?: string
  id?: string
  subcategories?: Array<{ name?: string; name_encoded?: string; slug?: string }>
  children?: Array<{ name?: string; name_encoded?: string; slug?: string }>
  gif?: KlipyApiItem
  preview?: KlipyApiItem
}

type GridResult = { items: KlipySearchItem[]; nextOffset: number | null }

const GRID_TTL_MS = 120_000
const GRID_STALE_MS = 86_400_000
const CAT_LIST_TTL_MS = 600_000

const gridCache = new Map<string, { at: number; data: GridResult }>()
const categoryListCache = new Map<string, { at: number; data: KlipyCategoryDto[] }>()

/** Klipy в примерах рекомендует browser-like UA; пустой Node-fetch иногда даёт пустые выдачи. */
const KLIPY_FETCH_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (compatible; VervelBot/1.0; +https://vervel.ru)',
} as const

function segment(kind: KlipyKind): 'gifs' | 'stickers' {
  return kind === 'sticker' ? 'stickers' : 'gifs'
}

function clampPerPage(n: number): number {
  return Math.min(50, Math.max(8, Math.round(n) || 24))
}

function offsetToPage(offset: number, perPage: number): number {
  return Math.floor(Math.max(0, offset) / perPage) + 1
}

function normalizeMediaUrl(raw: string): string | null {
  const s = raw.trim()
  if (s.startsWith('https://')) return s
  if (s.startsWith('http://')) return s
  if (s.startsWith('//')) return `https:${s}`
  return null
}

function getNestedUrl(obj: unknown, path: string[]): string | null {
  let cur: unknown = obj
  for (const key of path) {
    if (!cur || typeof cur !== 'object') return null
    cur = (cur as Record<string, unknown>)[key]
  }
  if (typeof cur === 'string') return normalizeMediaUrl(cur)
  if (cur && typeof cur === 'object' && typeof (cur as KlipyFileNode).url === 'string') {
    return normalizeMediaUrl((cur as KlipyFileNode).url!)
  }
  return null
}

function getNested(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj
  for (const key of path) {
    if (!cur || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  return cur
}

function nodeDims(node: unknown): { w?: number; h?: number } {
  if (!node || typeof node !== 'object') return {}
  const n = node as KlipyFileNode
  const w = n.width !== undefined ? Number(n.width) : Number.NaN
  const h = n.height !== undefined ? Number(n.height) : Number.NaN
  return {
    w: Number.isFinite(w) && w > 0 ? w : undefined,
    h: Number.isFinite(h) && h > 0 ? h : undefined,
  }
}

function pickFromFileTree(fileRoot: unknown): {
  previewUrl: string
  url: string
  previewWidth?: number
  previewHeight?: number
} | null {
  if (!fileRoot || typeof fileRoot !== 'object') return null

  const previewCandidates: Array<{ url: string; w?: number; h?: number }> = []
  const tryPush = (path: string[]) => {
    const url = getNestedUrl(fileRoot, path)
    if (!url) return
    const node = getNested(fileRoot, path)
    const { w, h } = nodeDims(node)
    previewCandidates.push({ url, w, h })
  }

  tryPush(['xs', 'jpg'])
  tryPush(['xs', 'webp'])
  tryPush(['sm', 'jpg'])
  tryPush(['sm', 'webp'])
  tryPush(['md', 'jpg'])

  const sendUrl =
    getNestedUrl(fileRoot, ['hd', 'gif']) ??
    getNestedUrl(fileRoot, ['gif']) ??
    getNestedUrl(fileRoot, ['md', 'gif']) ??
    previewCandidates[0]?.url ??
    null

  const previewUrl = previewCandidates[0]?.url ?? sendUrl
  if (!previewUrl || !sendUrl) return null

  const p0 = previewCandidates[0]
  return {
    previewUrl,
    url: sendUrl,
    previewWidth: p0?.w,
    previewHeight: p0?.h,
  }
}

/** Обход дерева `file`/`files`: реальный API может отличаться от учебных примеров. */
function collectMediaUrls(obj: unknown): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const visit = (v: unknown) => {
    if (!v || typeof v !== 'object') return
    if (Array.isArray(v)) {
      for (const x of v) visit(x)
      return
    }
    const rec = v as Record<string, unknown>
    const u = rec.url
    if (typeof u === 'string') {
      const n = normalizeMediaUrl(u)
      if (n && !seen.has(n)) {
        seen.add(n)
        out.push(n)
      }
    }
    for (const k of Object.keys(rec)) {
      if (k === 'url') continue
      visit(rec[k])
    }
  }
  visit(obj)
  return out
}

function fallbackPickFromFileTree(fileRoot: unknown): {
  previewUrl: string
  url: string
  previewWidth?: number
  previewHeight?: number
} | null {
  const urls = collectMediaUrls(fileRoot)
  if (urls.length === 0) return null
  const gif =
    urls.find((u) => /\.gif(\?|$)/i.test(u)) ??
    urls.find((u) => /\/gif\//i.test(u) || /gif\//i.test(u))
  const still =
    urls.find((u) => /\.(jpe?g|webp|png)(\?|$)/i.test(u)) ?? urls[0]
  const sendUrl = gif ?? still
  const previewUrl = still !== sendUrl ? still : urls.find((u) => u !== sendUrl) ?? sendUrl
  if (!sendUrl || !previewUrl) return null
  return { previewUrl, url: sendUrl }
}

function itemId(item: KlipyApiItem): string {
  const id = item.id ?? item.slug
  return typeof id === 'string' && id.length > 0 ? id : 'unknown'
}

function mapItem(item: KlipyApiItem): KlipySearchItem | null {
  const root = (item.file ?? item.files ?? item.media) as unknown
  const picked = pickFromFileTree(root) ?? fallbackPickFromFileTree(root)
  if (!picked) return null
  const dimNode =
    getNested(root, ['hd', 'gif']) ?? getNested(root, ['gif']) ?? getNested(root, ['xs', 'jpg'])
  const { w, h } = nodeDims(dimNode)
  return {
    id: itemId(item),
    previewUrl: picked.previewUrl,
    url: picked.url,
    previewWidth: picked.previewWidth ?? w,
    previewHeight: picked.previewHeight ?? h,
  }
}

function coercePerPage(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** HTTP 200 + `result: false` — ошибка ключа/лимита; иначе легко получить «успех» с пустым массивом. */
function assertKlipyResult(body: unknown, context: string): void {
  if (!body || typeof body !== 'object') return
  const b = body as Record<string, unknown>
  if (b.result !== false) return
  const err = b.errors
  let msg = context
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message: unknown }).message
    msg = `${context}: ${typeof m === 'string' ? m : JSON.stringify(m)}`
  } else if (err !== undefined) {
    msg = `${context}: ${JSON.stringify(err)}`
  }
  throw new Error(msg)
}

function unwrapDataArray(body: unknown): {
  rows: KlipyApiItem[]
  hasNext: boolean | null
  perPage: number | null
} {
  if (!body || typeof body !== 'object') return { rows: [], hasNext: null, perPage: null }
  const b = body as Record<string, unknown>
  let pack: unknown = b.data
  if (Array.isArray(pack)) {
    return { rows: pack as KlipyApiItem[], hasNext: null, perPage: null }
  }
  if (pack && typeof pack === 'object' && 'data' in (pack as object)) {
    const inner = pack as Record<string, unknown>
    const rows = Array.isArray(inner.data) ? (inner.data as KlipyApiItem[]) : []
    const hasNext = typeof inner.has_next === 'boolean' ? inner.has_next : null
    const perPage = coercePerPage(inner.per_page)
    return { rows, hasNext, perPage }
  }
  return { rows: [], hasNext: null, perPage: null }
}

function nextOffsetFromPage(
  offset: number,
  itemsLen: number,
  perPage: number,
  hasNext: boolean | null
): number | null {
  if (itemsLen === 0) return null
  if (hasNext === false) return null
  if (hasNext === true) return offset + itemsLen
  // Нет флага — эвристика: полная страница, скорее всего, есть продолжение
  if (itemsLen >= perPage) return offset + itemsLen
  return null
}

function mapCategory(raw: KlipyApiCategory): KlipyCategoryDto {
  const subs = raw.subcategories ?? raw.children ?? []
  const first = subs[0]?.name_encoded?.trim() || subs[0]?.slug?.trim()
  const defaultTagEncoded = first && first.length > 0 ? first : null
  const name = raw.name ?? raw.title ?? ''
  const enc = raw.name_encoded ?? raw.slug ?? raw.id ?? name
  const previewItem = raw.gif ?? raw.preview
  const picked = previewItem ? mapItem(previewItem) : null
  return {
    name,
    name_encoded: String(enc),
    defaultTagEncoded,
    categoryPreviewUrl: picked?.previewUrl ?? null,
  }
}

function unwrapCategoryArray(body: unknown): KlipyApiCategory[] {
  if (!body || typeof body !== 'object') return []
  const b = body as Record<string, unknown>
  let pack: unknown = b.data
  if (Array.isArray(pack)) return pack as KlipyApiCategory[]
  if (pack && typeof pack === 'object' && 'data' in (pack as object)) {
    const inner = (pack as Record<string, unknown>).data
    if (Array.isArray(inner)) return inner as KlipyApiCategory[]
  }
  return []
}

async function cachedGrid(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<GridResult>
): Promise<GridResult> {
  const now = Date.now()
  const hit = gridCache.get(key)
  if (hit && now - hit.at < ttlMs) return hit.data
  try {
    const data = await fetcher()
    gridCache.set(key, { at: now, data })
    return data
  } catch (e) {
    const is429 = e instanceof Error && /HTTP 429/.test(e.message)
    if (is429 && hit && now - hit.at < GRID_STALE_MS) return hit.data
    throw e
  }
}

async function cachedCategoryList(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<KlipyCategoryDto[]>
): Promise<KlipyCategoryDto[]> {
  const now = Date.now()
  const hit = categoryListCache.get(key)
  if (hit && now - hit.at < ttlMs) return hit.data
  try {
    const data = await fetcher()
    categoryListCache.set(key, { at: now, data })
    return data
  } catch (e) {
    const is429 = e instanceof Error && /HTTP 429/.test(e.message)
    if (is429 && hit && now - hit.at < GRID_STALE_MS) return hit.data
    throw e
  }
}

export default class KlipyService {
  static getApiKey(): string | undefined {
    const fromSchema = env.get('KLIPY_API_KEY')
    if (typeof fromSchema === 'string' && fromSchema.trim().length > 0) return fromSchema.trim()
    const raw = process.env.KLIPY_API_KEY
    if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim()
    return undefined
  }

  /** Без trailing slash. По умолчанию: https://api.klipy.com/api/v1 */
  static getBaseUrl(): string {
    const fromSchema = env.get('KLIPY_API_BASE')
    const raw =
      (typeof fromSchema === 'string' && fromSchema.trim()) ||
      (typeof process.env.KLIPY_API_BASE === 'string' && process.env.KLIPY_API_BASE.trim()) ||
      'https://api.klipy.com/api/v1'
    return raw.replace(/\/+$/, '')
  }

  static assertConfigured(): string {
    const key = this.getApiKey()
    if (!key) throw new Error('KLIPY_API_KEY not configured')
    return key
  }

  static clearCaches() {
    gridCache.clear()
    categoryListCache.clear()
  }

  private static resourceUrl(kind: KlipyKind, ...segments: string[]): string {
    const key = encodeURIComponent(this.assertConfigured())
    return [this.getBaseUrl(), key, segment(kind), ...segments.map((s) => String(s))].join('/')
  }

  static async listCategories(kind: KlipyKind): Promise<KlipyCategoryDto[]> {
    const cacheKey = `lc:${kind}`
    return cachedCategoryList(cacheKey, CAT_LIST_TTL_MS, async () => {
      const url = new URL(this.resourceUrl(kind, 'categories'))
      const res = await fetch(url.toString(), { headers: KLIPY_FETCH_HEADERS })
      if (!res.ok) {
        if (kind === 'sticker') return []
        throw new Error(`Klipy categories HTTP ${res.status}`)
      }
      const body: unknown = await res.json()
      assertKlipyResult(body, 'Klipy categories')
      return unwrapCategoryArray(body).map(mapCategory)
    })
  }

  static async search(query: string, offset: number, limit: number, kind: KlipyKind = 'gif') {
    const perPage = clampPerPage(limit)
    const page = offsetToPage(offset, perPage)
    const qKey = query.trim().toLowerCase().slice(0, 200)
    const cacheKey = `s:${kind}:${offset}:${perPage}:${page}:${qKey}`

    return cachedGrid(cacheKey, GRID_TTL_MS, async () => {
      const url = new URL(this.resourceUrl(kind, 'search'))
      url.searchParams.set('q', query)
      url.searchParams.set('per_page', String(perPage))
      url.searchParams.set('page', String(page))
      url.searchParams.set('rating', 'g')

      const res = await fetch(url.toString(), { headers: KLIPY_FETCH_HEADERS })
      if (!res.ok) throw new Error(`Klipy search HTTP ${res.status}`)
      const body: unknown = await res.json()
      assertKlipyResult(body, 'Klipy search')
      const { rows, hasNext, perPage: respPer } = unwrapDataArray(body)
      const items = rows.map(mapItem).filter((x): x is KlipySearchItem => x !== null)
      const pp = respPer ?? perPage
      return { items, nextOffset: nextOffsetFromPage(offset, items.length, pp, hasNext) }
    })
  }

  static async trending(offset: number, limit: number, kind: KlipyKind = 'gif') {
    const perPage = clampPerPage(limit)
    const page = offsetToPage(offset, perPage)
    const cacheKey = `t:${kind}:${offset}:${perPage}:${page}`

    return cachedGrid(cacheKey, GRID_TTL_MS, async () => {
      const url = new URL(this.resourceUrl(kind, 'trending'))
      url.searchParams.set('per_page', String(perPage))
      url.searchParams.set('page', String(page))
      url.searchParams.set('rating', 'g')

      const res = await fetch(url.toString(), { headers: KLIPY_FETCH_HEADERS })
      if (!res.ok) throw new Error(`Klipy trending HTTP ${res.status}`)
      const body: unknown = await res.json()
      assertKlipyResult(body, 'Klipy trending')
      const { rows, hasNext, perPage: respPer } = unwrapDataArray(body)
      const items = rows.map(mapItem).filter((x): x is KlipySearchItem => x !== null)
      const pp = respPer ?? perPage
      return { items, nextOffset: nextOffsetFromPage(offset, items.length, pp, hasNext) }
    })
  }

  static async categoryGifs(
    kind: KlipyKind,
    categoryEncoded: string,
    tagEncoded: string,
    offset: number,
    limit: number
  ) {
    const perPage = clampPerPage(limit)
    const page = offsetToPage(offset, perPage)
    const cacheKey = `cg:${kind}:${categoryEncoded}:${tagEncoded}:${offset}:${perPage}:${page}`

    return cachedGrid(cacheKey, GRID_TTL_MS, async () => {
      const pathUrl = new URL(
        this.resourceUrl(
          kind,
          'categories',
          encodeURIComponent(categoryEncoded),
          encodeURIComponent(tagEncoded)
        )
      )
      pathUrl.searchParams.set('per_page', String(perPage))
      pathUrl.searchParams.set('page', String(page))
      pathUrl.searchParams.set('rating', 'g')

      const res = await fetch(pathUrl.toString(), { headers: KLIPY_FETCH_HEADERS })
      if (!res.ok) {
        if (kind === 'sticker') {
          const q = `${categoryEncoded} ${tagEncoded}`
            .replace(/-/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
          return KlipyService.search(q, offset, limit, 'sticker')
        }
        throw new Error(`Klipy category HTTP ${res.status}`)
      }
      const body: unknown = await res.json()
      assertKlipyResult(body, 'Klipy category')
      const { rows, hasNext, perPage: respPer } = unwrapDataArray(body)
      const items = rows.map(mapItem).filter((x): x is KlipySearchItem => x !== null)
      const pp = respPer ?? perPage
      return { items, nextOffset: nextOffsetFromPage(offset, items.length, pp, hasNext) }
    })
  }
}
