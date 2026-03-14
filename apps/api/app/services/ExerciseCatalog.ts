import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// ──────────────────────────────────────────────
// Типы
// ──────────────────────────────────────────────

export interface CatalogExercise {
  id: string
  title: string
  category: 'strength' | 'olympic' | 'gymnastics' | 'functional' | 'cardio'
  keywords: string[]
  zones: string[]
  intensity: number
  imageUrl: string | null
}

export interface CatalogExerciseFull extends CatalogExercise {
  instructions: string[]
  allImages: string[]
}

interface RawExercise {
  id: string
  name: string
  category: string
  level: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  images: string[]
  instructions: string[]
}

// ──────────────────────────────────────────────
// Маппинги
// ──────────────────────────────────────────────

const MUSCLE_TO_ZONE: Record<string, string> = {
  chest:          'chests',
  abdominals:     'core',
  obliques:       'obliques',
  lats:           'back',
  'middle back':  'back',
  'lower back':   'back',
  traps:          'back',
  biceps:         'biceps',
  triceps:        'triceps',
  shoulders:      'shoulders',
  quadriceps:     'legs',
  hamstrings:     'legs',
  calves:         'calves',   // separate zone, not merged into legs
  abductors:      'legs',
  adductors:      'legs',
  glutes:         'glutes',
  forearms:       'forearms',
  neck:           'shoulders',
}

const CATEGORY_MAP: Record<string, CatalogExercise['category']> = {
  strength: 'strength',
  powerlifting: 'strength',
  'olympic weightlifting': 'olympic',
  plyometrics: 'functional',
  strongman: 'functional',
  cardio: 'cardio',
  stretching: 'cardio',
}

const INTENSITY_BY_LEVEL: Record<string, number> = {
  beginner: 0.5,
  intermediate: 0.7,
  expert: 0.9,
}

// GitHub raw URL для изображений из free-exercise-db
const IMAGE_BASE_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'

// ──────────────────────────────────────────────
// Singleton: загружается один раз при старте
// ──────────────────────────────────────────────

function loadCatalog(): Map<string, CatalogExerciseFull> {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const jsonPath = join(__dirname, '../../database/data/exercises.json')
  const raw: RawExercise[] = JSON.parse(readFileSync(jsonPath, 'utf-8'))

  const map = new Map<string, CatalogExerciseFull>()

  for (const ex of raw) {
    const category = CATEGORY_MAP[ex.category]
    if (!category) continue

    const zones = new Set<string>()
    for (const m of [...ex.primaryMuscles, ...ex.secondaryMuscles]) {
      const z = MUSCLE_TO_ZONE[m]
      if (z) zones.add(z)
    }
    if (zones.size === 0) continue

    // Ключевые слова: английские слова из ID (напр. "Bench_Press" → ["bench press", "bench", "press"])
    const phrase = ex.id.replace(/_/g, ' ').toLowerCase()
    const words = phrase.split(' ').filter((w) => w.length > 2)
    const keywords = [...new Set([phrase, ...words])]

    const allImages = ex.images.map((img) => `${IMAGE_BASE_URL}/${img}`)

    map.set(ex.id, {
      id: ex.id,
      title: ex.name,
      category,
      keywords,
      zones: [...zones],
      intensity: INTENSITY_BY_LEVEL[ex.level] ?? 0.6,
      imageUrl: allImages[0] ?? null,
      instructions: ex.instructions ?? [],
      allImages,
    })
  }

  return map
}

// Загружаем один раз при импорте модуля
const catalogMap: Map<string, CatalogExerciseFull> = loadCatalog()
const catalogArray: CatalogExercise[] = [...catalogMap.values()].map(
  ({ instructions: _i, allImages: _a, ...rest }) => rest
)

// ──────────────────────────────────────────────
// API
// ──────────────────────────────────────────────

export const ExerciseCatalog = {
  /** Все упражнения как массив (без instructions/allImages для экономии трафика) */
  all(): CatalogExercise[] {
    return catalogArray
  },

  /** Найти по ID (лёгкий объект, без инструкций) */
  find(id: string): CatalogExercise | undefined {
    const ex = catalogMap.get(id)
    if (!ex) return undefined
    const { instructions: _i, allImages: _a, ...rest } = ex
    return rest
  },

  /** Найти по ID с полными данными (инструкции + все изображения) */
  findFull(id: string): CatalogExerciseFull | undefined {
    return catalogMap.get(id)
  },

  /** Найти несколько по массиву ID → Map<id, exercise> */
  findMany(ids: string[]): Map<string, CatalogExercise> {
    const result = new Map<string, CatalogExercise>()
    for (const id of ids) {
      const ex = catalogMap.get(id)
      if (ex) {
        const { instructions: _i, allImages: _a, ...rest } = ex
        result.set(id, rest)
      }
    }
    return result
  },
}
