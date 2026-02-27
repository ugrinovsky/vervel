import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Exercise from '#models/exercise'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// ──────────────────────────────────────────────
// Маппинг мышц → зоны нашего приложения
// ──────────────────────────────────────────────
const MUSCLE_TO_ZONE: Record<string, string> = {
  chest: 'chests',
  abdominals: 'core',
  lats: 'back',
  'middle back': 'back',
  'lower back': 'back',
  traps: 'back',
  biceps: 'biceps',
  triceps: 'triceps',
  shoulders: 'shoulders',
  quadriceps: 'legs',
  hamstrings: 'legs',
  calves: 'legs',
  abductors: 'legs',
  adductors: 'legs',
  glutes: 'glutes',
  forearms: 'forearms',
  neck: 'shoulders', // трапеции/шея → плечевой пояс
}

// ──────────────────────────────────────────────
// Маппинг категорий → наши категории
// ──────────────────────────────────────────────
const CATEGORY_MAP: Record<string, Exercise['category']> = {
  strength: 'strength',
  powerlifting: 'strength',
  'olympic weightlifting': 'olympic',
  plyometrics: 'functional',
  strongman: 'functional',
  cardio: 'cardio',
  stretching: 'cardio',
}

// ──────────────────────────────────────────────
// Интенсивность по уровню сложности
// ──────────────────────────────────────────────
const INTENSITY_BY_LEVEL: Record<string, number> = {
  beginner: 0.5,
  intermediate: 0.7,
  expert: 0.9,
}

interface RawExercise {
  id: string
  name: string
  category: string
  level: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  equipment: string | null
  images: string[]
}

/**
 * Конвертирует ID вида "Bench_Press" в ["bench press", "bench", "press"]
 */
function idToKeywords(id: string): string[] {
  const phrase = id.replace(/_/g, ' ').toLowerCase()
  const words = phrase.split(' ').filter((w) => w.length > 2)
  return [...new Set([phrase, ...words])]
}

/**
 * Маппит массив мышц в уникальные зоны, пропуская неизвестные.
 * primaryMuscles дают основные зоны, secondaryMuscles — дополнительные.
 */
function musclesToZones(primary: string[], secondary: string[]): string[] {
  const zones = new Set<string>()
  for (const m of primary) {
    const zone = MUSCLE_TO_ZONE[m]
    if (zone) zones.add(zone)
  }
  for (const m of secondary) {
    const zone = MUSCLE_TO_ZONE[m]
    if (zone) zones.add(zone)
  }
  return [...zones]
}

export default class FreeExerciseSeeder extends BaseSeeder {
  static environment: string[] = ['development', 'production']

  public async run() {
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const raw: RawExercise[] = JSON.parse(
      readFileSync(join(__dirname, '../data/exercises.json'), 'utf-8')
    )

    const exercises = raw
      .map((ex) => {
        const category = CATEGORY_MAP[ex.category]
        if (!category) return null // пропускаем неизвестные категории

        const zones = musclesToZones(ex.primaryMuscles, ex.secondaryMuscles)
        if (zones.length === 0) return null // нет известных мышц — пропускаем

        return {
          id: ex.id,
          title: ex.name,
          category,
          keywords: idToKeywords(ex.id),
          zones,
          intensity: INTENSITY_BY_LEVEL[ex.level] ?? 0.6,
        }
      })
      .filter(Boolean) as {
      id: string
      title: string
      category: Exercise['category']
      keywords: string[]
      zones: string[]
      intensity: number
    }[]

    // Вставляем батчами по 100 чтобы не упереться в лимиты SQL
    const BATCH = 100
    for (let i = 0; i < exercises.length; i += BATCH) {
      await Exercise.updateOrCreateMany('id', exercises.slice(i, i + BATCH))
    }

    console.log(`✅ Импортировано ${exercises.length} упражнений из ${raw.length}`)
  }
}
