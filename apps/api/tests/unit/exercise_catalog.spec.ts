import { test } from '@japa/runner'
import { ExerciseCatalog } from '#services/ExerciseCatalog'

// ─── all() ─────────────────────────────────────────────────────────────────

test.group('ExerciseCatalog: all()', () => {
  test('возвращает непустой массив', ({ assert }) => {
    const exercises = ExerciseCatalog.all()
    assert.isArray(exercises)
    assert.isAbove(exercises.length, 0)
  })

  test('каждое упражнение имеет обязательные поля', ({ assert }) => {
    for (const ex of ExerciseCatalog.all().slice(0, 20)) {
      assert.isString(ex.id, `id у ${ex.id}`)
      assert.isString(ex.title, `title у ${ex.id}`)
      assert.isArray(ex.zones, `zones у ${ex.id}`)
      assert.isAbove(ex.zones.length, 0, `zones не пустой у ${ex.id}`)
      assert.isNumber(ex.intensity, `intensity у ${ex.id}`)
      assert.include(['strength', 'olympic', 'gymnastics', 'functional', 'cardio'], ex.category)
    }
  })

  test('intensity в диапазоне 0–1', ({ assert }) => {
    for (const ex of ExerciseCatalog.all()) {
      assert.isAtLeast(ex.intensity, 0)
      assert.isAtMost(ex.intensity, 1)
    }
  })

  test('лёгкий объект не содержит instructions и allImages', ({ assert }) => {
    for (const ex of ExerciseCatalog.all().slice(0, 5)) {
      assert.notProperty(ex, 'instructions')
      assert.notProperty(ex, 'allImages')
    }
  })

  test('каждый ID уникален', ({ assert }) => {
    const ids = ExerciseCatalog.all().map((e) => e.id)
    const unique = new Set(ids)
    assert.equal(unique.size, ids.length)
  })
})

// ─── find() ────────────────────────────────────────────────────────────────

test.group('ExerciseCatalog: find()', () => {
  test('возвращает undefined для несуществующего ID', ({ assert }) => {
    assert.isUndefined(ExerciseCatalog.find('__non_existent__'))
  })

  test('находит упражнение по ID', ({ assert }) => {
    const first = ExerciseCatalog.all()[0]
    const result = ExerciseCatalog.find(first.id)
    assert.isDefined(result)
    assert.equal(result!.id, first.id)
    assert.equal(result!.title, first.title)
  })

  test('не содержит instructions в возвращаемом объекте', ({ assert }) => {
    const first = ExerciseCatalog.all()[0]
    const result = ExerciseCatalog.find(first.id)
    assert.notProperty(result!, 'instructions')
    assert.notProperty(result!, 'allImages')
  })
})

// ─── findFull() ────────────────────────────────────────────────────────────

test.group('ExerciseCatalog: findFull()', () => {
  test('возвращает undefined для несуществующего ID', ({ assert }) => {
    assert.isUndefined(ExerciseCatalog.findFull('__non_existent__'))
  })

  test('возвращает объект с instructions и allImages', ({ assert }) => {
    const first = ExerciseCatalog.all()[0]
    const result = ExerciseCatalog.findFull(first.id)
    assert.isDefined(result)
    assert.isArray(result!.instructions)
    assert.isArray(result!.allImages)
  })

  test('imageUrl совпадает с первым элементом allImages (или оба null/пустые)', ({ assert }) => {
    const first = ExerciseCatalog.all()[0]
    const result = ExerciseCatalog.findFull(first.id)!
    if (result.allImages.length > 0) {
      assert.equal(result.imageUrl, result.allImages[0])
    } else {
      assert.isNull(result.imageUrl)
    }
  })

  test('allImages содержат полные HTTPS URL', ({ assert }) => {
    for (const ex of ExerciseCatalog.all().slice(0, 10)) {
      const full = ExerciseCatalog.findFull(ex.id)!
      for (const url of full.allImages) {
        assert.match(url, /^https:\/\//)
      }
    }
  })
})

// ─── findMany() ────────────────────────────────────────────────────────────

test.group('ExerciseCatalog: findMany()', () => {
  test('возвращает пустую Map для пустого массива', ({ assert }) => {
    const result = ExerciseCatalog.findMany([])
    assert.equal(result.size, 0)
  })

  test('находит несколько упражнений по ID', ({ assert }) => {
    const ids = ExerciseCatalog.all().slice(0, 3).map((e) => e.id)
    const result = ExerciseCatalog.findMany(ids)
    assert.equal(result.size, 3)
    for (const id of ids) {
      assert.isTrue(result.has(id))
    }
  })

  test('игнорирует несуществующие ID', ({ assert }) => {
    const ids = [ExerciseCatalog.all()[0].id, '__fake_id__']
    const result = ExerciseCatalog.findMany(ids)
    assert.equal(result.size, 1)
    assert.isFalse(result.has('__fake_id__'))
  })

  test('возвращённые упражнения не содержат instructions', ({ assert }) => {
    const ids = ExerciseCatalog.all().slice(0, 2).map((e) => e.id)
    const result = ExerciseCatalog.findMany(ids)
    for (const ex of result.values()) {
      assert.notProperty(ex, 'instructions')
      assert.notProperty(ex, 'allImages')
    }
  })

  test('дублирующиеся ID не увеличивают размер Map', ({ assert }) => {
    const id = ExerciseCatalog.all()[0].id
    const result = ExerciseCatalog.findMany([id, id, id])
    assert.equal(result.size, 1)
  })
})

test.group('ExerciseCatalog: keywords (AI match)', () => {
  test('у длинного названия с «жим» нет отдельного keyword «жим»', ({ assert }) => {
    const ex = ExerciseCatalog.find('Alternating_Cable_Shoulder_Press')
    assert.isDefined(ex)
    assert.isFalse(ex!.keywords.includes('жим'))
  })

  test('жим лёжа тоже без отдельного keyword «жим» (матч по полному title)', ({ assert }) => {
    const ex = ExerciseCatalog.find('Barbell_Bench_Press_-_Medium_Grip')
    assert.isDefined(ex)
    assert.isFalse(ex!.keywords.includes('жим'))
  })
})
