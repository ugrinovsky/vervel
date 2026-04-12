import env from '#start/env'

export type GiphyKind = 'gif' | 'sticker'

export type GiphySearchItem = {
  id: string
  previewUrl: string
  url: string
  /** Размеры превью из GIPHY (rendition fixed_height_small / fallback) */
  previewWidth?: number
  previewHeight?: number
}

export type GiphyCategoryDto = {
  name: string
  name_encoded: string
  /** Первый тег подборки GIPHY для `/categories/{cat}/{tag}`; без него — поиск по `name`. */
  defaultTagEncoded: string | null
  /** Превью из `gif` в ответе категорий (рендер fixed_height_small / fallback). */
  categoryPreviewUrl: string | null
}

type GiphyRendition = {
  url?: string
  width?: string | number
  height?: string | number
}

type GiphyImageSet = {
  original?: GiphyRendition
  fixed_height?: GiphyRendition
  fixed_width?: GiphyRendition
  fixed_height_small?: GiphyRendition
  fixed_width_small?: GiphyRendition
  downsized?: GiphyRendition
  downsized_medium?: GiphyRendition
  downsized_small?: GiphyRendition
  preview_gif?: GiphyRendition
  looping?: GiphyRendition
  hd?: GiphyRendition
  fixed_height_still?: GiphyRendition
  fixed_width_still?: GiphyRendition
}

function renditionSize(r: GiphyRendition | undefined): { w?: number; h?: number } {
  if (!r) return {}
  const nw = r.width !== undefined ? Number(r.width) : Number.NaN
  const nh = r.height !== undefined ? Number(r.height) : Number.NaN
  return {
    w: Number.isFinite(nw) && nw > 0 ? nw : undefined,
    h: Number.isFinite(nh) && nh > 0 ? nh : undefined,
  }
}

type GiphyApiGif = {
  id: string
  images: GiphyImageSet
}

type GiphyApiCategory = {
  name: string
  name_encoded: string
  subcategories?: Array<{ name: string; name_encoded: string }>
  gif?: GiphyApiGif
}

type GiphySearchResponse = {
  data: GiphyApiGif[]
  pagination?: { count: number; offset: number; total_count: number }
}

function pickPreview(images: GiphyImageSet): {
  url: string
  previewWidth?: number
  previewHeight?: number
} | null {
  const chain: GiphyRendition[] = [
    images.fixed_height_small,
    images.downsized,
    images.fixed_height,
  ].filter((x): x is GiphyRendition => Boolean(x?.url))

  const first = chain[0]
  if (!first?.url) return null
  const { w, h } = renditionSize(first)
  return {
    url: first.url,
    previewWidth: w,
    previewHeight: h,
  }
}

/** У многих рендеров есть url, но без width/height; берём первые валидные пиксели из объекта images (как в ответе GIPHY). */
function firstIntrinsicSize(images: GiphyImageSet): { w: number; h: number } | null {
  const order: (keyof GiphyImageSet)[] = [
    'original',
    'fixed_height',
    'fixed_width',
    'downsized',
    'fixed_height_small',
    'fixed_width_small',
    'downsized_medium',
    'downsized_small',
    'preview_gif',
    'looping',
    'hd',
    'fixed_height_still',
    'fixed_width_still',
  ]
  for (const key of order) {
    const { w, h } = renditionSize(images[key])
    if (w !== undefined && h !== undefined) return { w, h }
  }
  return null
}

function mapCategory(raw: GiphyApiCategory): GiphyCategoryDto {
  const first = raw.subcategories?.[0]?.name_encoded?.trim()
  const defaultTagEncoded = first && first.length > 0 ? first : null
  const picked = raw.gif ? pickPreview(raw.gif.images) : null
  return {
    name: raw.name,
    name_encoded: raw.name_encoded,
    defaultTagEncoded,
    categoryPreviewUrl: picked?.url ?? null,
  }
}

function mapGif(g: GiphyApiGif): GiphySearchItem | null {
  const picked = pickPreview(g.images)
  if (!picked) return null
  const send = g.images.downsized?.url ?? g.images.fixed_height?.url ?? picked.url
  if (!send) return null
  const intr = firstIntrinsicSize(g.images)
  return {
    id: g.id,
    previewUrl: picked.url,
    url: send,
    previewWidth: intr?.w ?? picked.previewWidth,
    previewHeight: intr?.h ?? picked.previewHeight,
  }
}

function nextOffset(pag: GiphySearchResponse['pagination']): number | null {
  if (!pag) return null
  const { count, offset, total_count: totalCount } = pag
  if (offset + count >= totalCount) return null
  return offset + count
}

function segment(kind: GiphyKind): 'gifs' | 'stickers' {
  return kind === 'sticker' ? 'stickers' : 'gifs'
}

type GridResult = { items: GiphySearchItem[]; nextOffset: number | null }

/** У GIPHY жёсткие лимиты на beta-ключе — кэш и stale при 429 снижают срывы в UI. */
const GRID_TTL_MS = 120_000
const GRID_STALE_MS = 86_400_000
const CAT_LIST_TTL_MS = 600_000

const gridCache = new Map<string, { at: number; data: GridResult }>()
const categoryListCache = new Map<string, { at: number; data: GiphyCategoryDto[] }>()

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
    if (is429 && hit && now - hit.at < GRID_STALE_MS) {
      return hit.data
    }
    throw e
  }
}

async function cachedCategoryList(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<GiphyCategoryDto[]>
): Promise<GiphyCategoryDto[]> {
  const now = Date.now()
  const hit = categoryListCache.get(key)
  if (hit && now - hit.at < ttlMs) return hit.data

  try {
    const data = await fetcher()
    categoryListCache.set(key, { at: now, data })
    return data
  } catch (e) {
    const is429 = e instanceof Error && /HTTP 429/.test(e.message)
    if (is429 && hit && now - hit.at < GRID_STALE_MS) {
      return hit.data
    }
    throw e
  }
}

export default class GiphyService {
  /** Adonis env + raw process.env (Docker / systemd). */
  static getApiKey(): string | undefined {
    const fromSchema = env.get('GIPHY_API_KEY')
    if (typeof fromSchema === 'string' && fromSchema.trim().length > 0) {
      return fromSchema.trim()
    }
    const raw = process.env.GIPHY_API_KEY
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return raw.trim()
    }
    return undefined
  }

  static assertConfigured(): string {
    const key = this.getApiKey()
    if (!key) throw new Error('GIPHY_API_KEY not configured')
    return key
  }

  /** Сброс in-memory кэша (тесты; при hot-reload процесса кэш и так пустой). */
  static clearCaches() {
    gridCache.clear()
    categoryListCache.clear()
  }

  static async listCategories(kind: GiphyKind): Promise<GiphyCategoryDto[]> {
    const apiKey = this.assertConfigured()
    const cacheKey = `lc:${kind}`

    const run = async (): Promise<GiphyCategoryDto[]> => {
      try {
        const url = new URL(`https://api.giphy.com/v1/${segment(kind)}/categories`)
        url.searchParams.set('api_key', apiKey)
        const res = await fetch(url.toString())

        if (!res.ok) {
          if (kind === 'sticker') {
            return []
          }
          throw new Error(`Giphy categories HTTP ${res.status}`)
        }
        const body = (await res.json()) as { data: GiphyApiCategory[] }
        return (body.data ?? []).map(mapCategory)
      } catch (e) {
        if (kind === 'sticker') {
          return []
        }
        throw e
      }
    }

    return cachedCategoryList(cacheKey, CAT_LIST_TTL_MS, run)
  }

  static async search(query: string, offset: number, limit: number, kind: GiphyKind = 'gif') {
    const apiKey = this.assertConfigured()
    const qKey = query.trim().toLowerCase().slice(0, 200)
    const cacheKey = `s:${kind}:${offset}:${limit}:${qKey}`

    return cachedGrid(cacheKey, GRID_TTL_MS, async () => {
      const url = new URL(`https://api.giphy.com/v1/${segment(kind)}/search`)
      url.searchParams.set('api_key', apiKey)
      url.searchParams.set('q', query)
      url.searchParams.set('limit', String(limit))
      url.searchParams.set('offset', String(offset))
      url.searchParams.set('rating', 'g')
      url.searchParams.set('lang', 'ru')

      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`Giphy search HTTP ${res.status}`)
      const body = (await res.json()) as GiphySearchResponse
      const items = (body.data ?? []).map(mapGif).filter((x): x is GiphySearchItem => x !== null)
      return { items, nextOffset: nextOffset(body.pagination) }
    })
  }

  static async trending(offset: number, limit: number, kind: GiphyKind = 'gif') {
    const apiKey = this.assertConfigured()
    const cacheKey = `t:${kind}:${offset}:${limit}`

    return cachedGrid(cacheKey, GRID_TTL_MS, async () => {
      const url = new URL(`https://api.giphy.com/v1/${segment(kind)}/trending`)
      url.searchParams.set('api_key', apiKey)
      url.searchParams.set('limit', String(limit))
      url.searchParams.set('offset', String(offset))
      url.searchParams.set('rating', 'g')

      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`Giphy trending HTTP ${res.status}`)
      const body = (await res.json()) as GiphySearchResponse
      const items = (body.data ?? []).map(mapGif).filter((x): x is GiphySearchItem => x !== null)
      return { items, nextOffset: nextOffset(body.pagination) }
    })
  }

  /** GIF/sticker grid for a category tag (GIPHY «подборка»). */
  static async categoryGifs(
    kind: GiphyKind,
    categoryEncoded: string,
    tagEncoded: string,
    offset: number,
    limit: number
  ) {
    const apiKey = this.assertConfigured()
    const cacheKey = `cg:${kind}:${categoryEncoded}:${tagEncoded}:${offset}:${limit}`

    return cachedGrid(cacheKey, GRID_TTL_MS, async () => {
      const base = `https://api.giphy.com/v1/${segment(kind)}/categories/${encodeURIComponent(categoryEncoded)}/${encodeURIComponent(tagEncoded)}`
      const url = new URL(base)
      url.searchParams.set('api_key', apiKey)
      url.searchParams.set('limit', String(limit))
      url.searchParams.set('offset', String(offset))
      url.searchParams.set('rating', 'g')

      const res = await fetch(url.toString())
      if (!res.ok) {
        if (kind === 'sticker') {
          const q = `${categoryEncoded} ${tagEncoded}`
            .replace(/-/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
          return GiphyService.search(q, offset, limit, 'sticker')
        }
        throw new Error(`Giphy category HTTP ${res.status}`)
      }
      const body = (await res.json()) as GiphySearchResponse
      const items = (body.data ?? []).map(mapGif).filter((x): x is GiphySearchItem => x !== null)
      return { items, nextOffset: nextOffset(body.pagination) }
    })
  }
}
