#!/usr/bin/env node
// Script to translate exercise names and instructions to proper Russian fitness terminology
// Uses OpenAI API in batches

const fs = require('fs');
const https = require('https');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const RU_FILE = '/Users/nazar/dev/vervel/apps/api/database/data/exercises.json';
const EN_FILE = '/Users/nazar/dev/vervel/apps/api/database/data/exercises_en.json';
const OUTPUT_FILE = '/Users/nazar/dev/vervel/apps/api/database/data/exercises.json';
const PROGRESS_FILE = '/Users/nazar/dev/vervel/translate_progress.json';

const BATCH_SIZE = 15; // exercises per API call

function callOpenAI(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'gpt-4o',
      messages,
      temperature: 0.2,
      max_tokens: 4000,
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(parsed.error.message));
          } else {
            resolve(parsed.choices[0].message.content);
          }
        } catch (e) {
          reject(new Error('Failed to parse response: ' + data.slice(0, 200)));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function translateBatch(exercises) {
  const input = exercises.map(ex => ({
    id: ex.id,
    name: ex.name,
    instructions: ex.instructions,
  }));

  const prompt = `You are a professional Russian fitness translator. Translate the following exercises from English to natural Russian fitness terminology.

Rules:
- Use established Russian gym terminology (e.g. "Жим лёжа", "Тяга верхнего блока", "Выпады", "Приседания со штангой")
- Avoid literal word-for-word translation
- "Good Morning" exercise → «Доброе утро» (with quotes only for this specific exercise name)
- Instructions: short, clear, imperative mood (Ляг на скамью. Возьми гриф...)
- "Alternate/Alternating" → "Поочерёдный" or "Попеременный" but full name must make natural sense
- Keep numbers/angles as-is (e.g. "90/90")
- "SMR" stays as "СМР" (самомассаж с роликом)
- "Renegade Row" → "Тяга гантели в планке"
- "Windmill" (kettlebell) → "Мельница"
- "Turkish Get-Up" → "Турецкий подъём"
- "Clean" (weightlifting) → "Подъём на грудь"
- "Snatch" → "Рывок"
- "Deadlift" → "Становая тяга"
- "Squat" → "Приседания"
- "Bench Press" → "Жим лёжа"
- "Pull-Up" → "Подтягивания"
- "Push-Up" → "Отжимания"
- "Lunge" → "Выпады"
- "Plank" → "Планка"
- "Crunch" → "Скручивания"
- "Curl" (bicep) → "Сгибание рук"
- "Row" → "Тяга"
- "Fly/Flyes" → "Разводка"
- "Raise" → "Подъём"
- "Extension" → "Разгибание"
- "Press" → "Жим"
- "Shrug" → "Шраги"
- "Rollout" → "Выкатывание"
- "Hip Thrust" → "Ягодичный мост"
- "Glute Bridge" → "Ягодичный мост"
- "Step-Up" → "Зашагивание на платформу"
- "Dip" → "Отжимания на брусьях" or "Отжимания от скамьи"
- "Skull Crusher" → "Французский жим"
- "Hack Squat" → "Гакк-приседания"
- "Pullover" → "Пуловер"
- "Cable" → "На блоке" or "С тросом"
- "Dumbbell" → "С гантелями" or "Гантельный"
- "Barbell" → "Со штангой" or "Штанговый"
- "Kettlebell" → "С гирей" or "Гиревой"
- "Band" → "С резиной" or "С эспандером"
- "Machine" → "В тренажёре"
- "Bodyweight" → "С собственным весом" or just the exercise name
- "Stretch" → "Растяжка"
- "Foam Roll/SMR" → "СМР (миофасциальный релиз)"

Return ONLY a valid JSON array with objects containing: id, name (Russian), instructions (array of Russian strings).
No markdown, no explanation, just the JSON array.

Exercises to translate:
${JSON.stringify(input, null, 2)}`;

  const response = await callOpenAI([
    { role: 'user', content: prompt }
  ]);

  // Parse the JSON response
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No JSON array found in response: ' + response.slice(0, 300));
  }

  return JSON.parse(jsonMatch[0]);
}

async function main() {
  console.log('Loading exercise files...');
  const ruExercises = JSON.parse(fs.readFileSync(RU_FILE, 'utf8'));
  const enExercises = JSON.parse(fs.readFileSync(EN_FILE, 'utf8'));

  // Build EN lookup by id
  const enById = {};
  enExercises.forEach(ex => { enById[ex.id] = ex; });

  // Load progress if exists
  let progress = {};
  if (fs.existsSync(PROGRESS_FILE)) {
    progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    console.log(`Resuming from progress: ${Object.keys(progress).length} already translated`);
  }

  // Process in batches
  const total = enExercises.length;
  let processed = Object.keys(progress).length;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = enExercises.slice(i, i + BATCH_SIZE);

    // Skip if all in batch already processed
    const needsProcessing = batch.filter(ex => !progress[ex.id]);
    if (needsProcessing.length === 0) {
      console.log(`Batch ${i}-${i+BATCH_SIZE}: already done, skipping`);
      continue;
    }

    console.log(`Translating batch ${i}-${Math.min(i+BATCH_SIZE, total)} (${needsProcessing.length} exercises)...`);

    let retries = 0;
    while (retries < 3) {
      try {
        const translated = await translateBatch(needsProcessing);

        // Store results
        translated.forEach(t => {
          progress[t.id] = { name: t.name, instructions: t.instructions };
        });

        // Save progress
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
        processed += needsProcessing.length;
        console.log(`  Done. Total: ${processed}/${total}`);
        break;
      } catch (e) {
        retries++;
        console.error(`  Error (attempt ${retries}/3): ${e.message}`);
        if (retries < 3) {
          await new Promise(r => setTimeout(r, 2000 * retries));
        } else {
          throw e;
        }
      }
    }

    // Small delay between batches
    if (i + BATCH_SIZE < total) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Apply translations to RU exercises
  console.log('\nApplying translations...');
  const updatedExercises = ruExercises.map(ex => {
    const trans = progress[ex.id];
    if (trans) {
      return {
        ...ex,
        name: trans.name,
        instructions: trans.instructions,
      };
    } else {
      console.warn(`WARNING: No translation found for ${ex.id}`);
      return ex;
    }
  });

  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(updatedExercises, null, 2));
  console.log(`\nDone! Written ${updatedExercises.length} exercises to ${OUTPUT_FILE}`);

  // Clean up progress file
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
    console.log('Progress file cleaned up.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
