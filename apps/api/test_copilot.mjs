/**
 * Тест генерации плана Copilot через YandexGPT напрямую.
 * Запуск: node test_copilot.mjs
 */

const API_KEY = process.env.YANDEX_CLOUD_API_KEY
const FOLDER_ID = process.env.YANDEX_FOLDER_ID
const MODEL = process.env.YANDEX_GPT_MODEL ?? 'yandexgpt'

if (!API_KEY || !FOLDER_ID) {
  throw new Error(
    'Missing Yandex Cloud credentials. Set YANDEX_CLOUD_API_KEY and YANDEX_FOLDER_ID in env before running.'
  )
}

const SYSTEM_PROMPT = `Ты — тренер-ассистент. Составь программу тренировок на неделю по данным об атлете.

Верни ТОЛЬКО валидный JSON без markdown и текста вокруг:
{"plan":[{"dayOffset":0,"workoutType":"bodybuilding","focus":"верх тела","exercises":[{"name":"Жим штанги лёжа","sets":4,"reps":8,"weight":70},{"name":"Тяга штанги в наклоне","sets":4,"reps":8,"weight":60},{"name":"Жим гантелей сидя","sets":3,"reps":12,"weight":20},{"name":"Тяга верхнего блока","sets":3,"reps":12,"weight":55}]}],"chatMessage":"Привет! На этой неделе..."}

Правила:

КОЛИЧЕСТВО УПРАЖНЕНИЙ:
- ОБЯЗАТЕЛЬНО 4–6 упражнений на каждую тренировку. Никогда меньше 4. Даже при высокой усталости (TSB < −10) — минимум 4 упражнения, просто снижай сеты и веса, но не сокращай список.

РАСПИСАНИЕ:
- dayOffset: 0=пн, 1=вт, 2=ср, 3=чт, 4=пт, 5=сб, 6=вс. Чередуй дни с отдыхом — не ставь тренировки два дня подряд где возможно.
- Количество объектов в plan строго = sessionsPerWeek. Не добавляй дни из existingDayOffsets.

ТИП ТРЕНИРОВКИ:
- workoutType ОБЯЗАН совпадать с trainerType из входных данных. Если trainerType не указан — "bodybuilding". НЕ СМЕШИВАЙ типы.
- "bodybuilding": силовые, изоляция, гипертрофия. Чередуй верх/низ тела между тренировками.
- "crossfit": функциональные круговые тренировки. Используй: берпи, трастеры, рывок гири, прыжки на ящик, воздушные приседания, двойные прыжки, подтягивания киппинг, толчок штанги, махи гирей. sets = раунды, reps = повторений за раунд. В notes укажи формат: "AMRAP 12 мин" / "EMOM 20 мин" / "For Time".
- "cardio": аэробные упражнения, LISS. duration в минутах, reps=null, weight=null.

ПЕРЕГРУЖЕННЫЕ ЗОНЫ (при наличии — строго соблюдай):
- "плечи" → НЕ ВКЛЮЧАЙ: жим вверх (любой), разведения в стороны, тягу к подбородку, армейский жим, отжимания, упражнения с акцентом на дельты.
- "грудь" → НЕ ВКЛЮЧАЙ: жим лёжа (штанга/гантели), разводки, отжимания, кроссовер.
- "спина" → НЕ ВКЛЮЧАЙ: подтягивания, тяги (штанга, блок, гантели), становую тягу, гиперэкстензию.
- "ноги" → НЕ ВКЛЮЧАЙ: приседания, жим ногами, выпады, сгибания/разгибания ног.
- "бицепс" → НЕ ВКЛЮЧАЙ: любые сгибания рук, тяги обратным хватом.
- "трицепс" → НЕ ВКЛЮЧАЙ: разгибания рук, жимы узким хватом, французский жим.

НАГРУЗКА ПО TSB:
- TSB < −10: сеты −20–30% от нормы, веса снизь на 10–15%. Исключи перегруженные зоны полностью.
- TSB > 15: полный объём, прогрессия весов, можно добавить дроп-сеты или суперсеты.

ПОЛЯ:
- focus: 1–3 слова (верх тела / ноги / спина и бицепс / full body / и т.п.).
- weight: кг или опусти поле (для упражнений с весом тела или кардио).
- duration: минуты для кардио/EMOM; для силовых — опусти поле.
- reps: обязателен для силовых и crossfit; для кардио — опусти поле.

СООБЩЕНИЕ:
- chatMessage: 2–3 предложения от тренера атлету, дружелюбно, на «ты». Скажи что запланировал и почему с учётом состояния атлета.`

const SCENARIOS = [
  {
    name: '🟢 Обычный атлет (норма, 3 тренировки, bodybuilding)',
    params: {
      sessionsPerWeek: 3,
      tsb: 2,
      tsbLabel: 'в норме',
      phase: 'accumulation',
      overloadedZones: [],
      daysSinceLastWorkout: 2,
      weekStartLabel: 'понедельник, 12 мая',
      existingDayOffsets: [],
      trainerPrimaryType: 'bodybuilding',
    },
  },
  {
    name: '🔴 Перегруженный атлет (TSB = -18, перегружены грудь и плечи)',
    params: {
      sessionsPerWeek: 3,
      tsb: -18,
      tsbLabel: 'сильно устал',
      phase: 'overload',
      overloadedZones: ['грудь', 'плечи'],
      daysSinceLastWorkout: 1,
      weekStartLabel: 'понедельник, 12 мая',
      existingDayOffsets: [],
      trainerPrimaryType: 'bodybuilding',
    },
  },
  {
    name: '⚡ Свежий атлет (TSB = +20, пик формы, crossfit, 4 тренировки)',
    params: {
      sessionsPerWeek: 4,
      tsb: 20,
      tsbLabel: 'свежий, высокая готовность',
      phase: 'peak',
      overloadedZones: [],
      daysSinceLastWorkout: 3,
      weekStartLabel: 'понедельник, 12 мая',
      existingDayOffsets: [],
      trainerPrimaryType: 'crossfit',
    },
  },
  {
    name: '😴 Давно не тренировался (14 дней, cold start)',
    params: {
      sessionsPerWeek: 2,
      tsb: 8,
      tsbLabel: 'в норме',
      phase: 'deload',
      overloadedZones: [],
      daysSinceLastWorkout: 14,
      weekStartLabel: 'понедельник, 12 мая',
      existingDayOffsets: [],
      trainerPrimaryType: 'bodybuilding',
    },
  },
]

function buildUserMessage(p) {
  const typeLabel =
    p.trainerPrimaryType === 'crossfit'
      ? 'CrossFit (функциональные блоки, круговые, HIIT)'
      : p.trainerPrimaryType === 'cardio'
        ? 'Кардио (аэробика, LISS)'
        : 'Силовая / бодибилдинг'

  return `Составь план на неделю.

Тренер специализируется на: ${typeLabel}
trainerType: ${p.trainerPrimaryType ?? 'bodybuilding'}

Состояние атлета:
- Фаза: ${p.phase}
- Усталость (TSB): ${p.tsb} (${p.tsbLabel})
- Перегруженные зоны: ${p.overloadedZones.length > 0 ? p.overloadedZones.join(', ') : 'нет'}
- Дней без тренировки: ${p.daysSinceLastWorkout}
- Тренировок в неделю: ${p.sessionsPerWeek}
- Неделя начинается: ${p.weekStartLabel}
${p.existingDayOffsets.length > 0 ? `- Уже запланированы смещения (пропусти): ${p.existingDayOffsets.join(', ')}` : ''}`
}

async function callGpt(userMessage) {
  const res = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Api-Key ${API_KEY}`,
    },
    body: JSON.stringify({
      modelUri: `gpt://${FOLDER_ID}/${MODEL}`,
      completionOptions: { stream: false, temperature: 0.4, maxTokens: 3000 },
      messages: [
        { role: 'system', text: SYSTEM_PROMPT },
        { role: 'user', text: userMessage },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`HTTP ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.result?.alternatives?.[0]?.message?.text ?? ''
}

function parseResult(raw) {
  const cleaned = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()
  return JSON.parse(cleaned)
}

function printPlan(parsed) {
  const DAY = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  for (const day of parsed.plan ?? []) {
    console.log(`  ${DAY[day.dayOffset] ?? '?'} [${day.workoutType}] — ${day.focus}`)
    for (const ex of day.exercises ?? []) {
      const detail = [
        ex.sets ? `${ex.sets} подх.` : null,
        ex.reps ? `× ${ex.reps} повт.` : null,
        ex.weight ? `${ex.weight} кг` : null,
        ex.duration ? `${ex.duration} мин` : null,
        ex.notes ? `(${ex.notes})` : null,
      ]
        .filter(Boolean)
        .join(' ')
      console.log(`    • ${ex.name} — ${detail}`)
    }
  }
  console.log(`\n  💬 ${parsed.chatMessage}`)
}

async function run() {
  const only = process.argv[2] // node test_copilot.mjs 2  → только сценарий #2

  for (const [i, scenario] of SCENARIOS.entries()) {
    if (only !== undefined && String(i + 1) !== only) continue

    console.log(`\n${'─'.repeat(60)}`)
    console.log(`${scenario.name}`)
    console.log('─'.repeat(60))

    const userMessage = buildUserMessage(scenario.params)
    const t0 = Date.now()

    try {
      const raw = await callGpt(userMessage)
      const ms = Date.now() - t0
      console.log(`⏱ ${ms}ms  |  Ответ: ${raw.length} символов`)

      let parsed
      try {
        parsed = parseResult(raw)
      } catch {
        console.log('❌ JSON parse failed. Raw response:')
        console.log(raw.slice(0, 800))
        continue
      }

      const dayCount = parsed.plan?.length ?? 0
      const expected = scenario.params.sessionsPerWeek
      const dayMatch = dayCount === expected ? '✅' : `❌ (ожидалось ${expected}, получили ${dayCount})`
      console.log(`Дней в плане: ${dayCount} ${dayMatch}`)

      const exCounts = (parsed.plan ?? []).map((d) => d.exercises?.length ?? 0)
      const minEx = Math.min(...exCounts)
      const exOk = minEx >= 4 ? '✅' : `❌ минимум ${minEx} упражнений в тренировке`
      console.log(`Упражнений min/max: ${minEx}/${Math.max(...exCounts)} ${exOk}`)

      printPlan(parsed)
    } catch (err) {
      console.log(`❌ Ошибка: ${err.message}`)
    }
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log('Готово.')
}

run()
