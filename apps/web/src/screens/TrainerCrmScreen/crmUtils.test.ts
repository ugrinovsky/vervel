import { describe, it, expect } from 'vitest';
import { computeGrowthData, formatFollowUp } from './crmUtils';
import type { LeadCrmStatus } from '@/api/trainer';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeLead(createdAt: string, crmStatus: LeadCrmStatus = 'new') {
  return { createdAt, crmStatus };
}

// ─── computeGrowthData ────────────────────────────────────────────────────────

describe('computeGrowthData', () => {
  it('возвращает [] для пустого массива', () => {
    expect(computeGrowthData([])).toEqual([]);
  });

  it('один лид — одна точка с total=1 converted=0', () => {
    const result = computeGrowthData([makeLead('2026-05-01T10:00:00', 'new')]);
    expect(result).toHaveLength(1);
    expect(result[0].total).toBe(1);
    expect(result[0].converted).toBe(0);
  });

  it('конвертированный лид увеличивает converted', () => {
    const result = computeGrowthData([makeLead('2026-05-01T10:00:00', 'converted')]);
    expect(result[0].converted).toBe(1);
    expect(result[0].total).toBe(1);
  });

  it('счётчик накопленный — каждая точка прибавляет к предыдущей', () => {
    const leads = [
      makeLead('2026-05-01T10:00:00', 'new'),
      makeLead('2026-05-02T10:00:00', 'converted'),
      makeLead('2026-05-03T10:00:00', 'new'),
    ];
    const result = computeGrowthData(leads);
    expect(result).toHaveLength(3);
    expect(result[0].total).toBe(1);
    expect(result[1].total).toBe(2);
    expect(result[2].total).toBe(3);
    expect(result[0].converted).toBe(0);
    expect(result[1].converted).toBe(1);
    expect(result[2].converted).toBe(1); // не прибавился
  });

  it('несколько лидов в один день — одна точка с суммой', () => {
    const leads = [
      makeLead('2026-05-01T09:00:00', 'new'),
      makeLead('2026-05-01T14:00:00', 'converted'),
      makeLead('2026-05-01T18:00:00', 'new'),
    ];
    const result = computeGrowthData(leads);
    expect(result).toHaveLength(1);
    expect(result[0].total).toBe(3);
    expect(result[0].converted).toBe(1);
  });

  it('span < 21 дня — группировка по дням', () => {
    const leads = [
      makeLead('2026-05-01T10:00:00', 'new'),
      makeLead('2026-05-10T10:00:00', 'new'),
    ];
    const result = computeGrowthData(leads);
    expect(result).toHaveLength(2); // два отдельных дня
  });

  it('span >= 21 дня — группировка по неделям', () => {
    // понедельники двух разных недель с разрывом > 21 дня
    const leads = [
      makeLead('2026-04-06T10:00:00', 'new'), // неделя 30 марта
      makeLead('2026-04-07T10:00:00', 'new'), // та же неделя
      makeLead('2026-05-04T10:00:00', 'new'), // неделя 4 мая (28+ дней спустя)
    ];
    const result = computeGrowthData(leads);
    // должно быть 2 недельных бакета, а не 3 дневных
    expect(result).toHaveLength(2);
    expect(result[0].total).toBe(2);
    expect(result[1].total).toBe(3);
  });

  it('точки отсортированы по дате (раньше — первее)', () => {
    const leads = [
      makeLead('2026-05-03T10:00:00', 'new'),
      makeLead('2026-05-01T10:00:00', 'new'),
      makeLead('2026-05-02T10:00:00', 'new'),
    ];
    const result = computeGrowthData(leads);
    expect(result[0].total).toBe(1);
    expect(result[1].total).toBe(2);
    expect(result[2].total).toBe(3);
  });
});

// ─── formatFollowUp ──────────────────────────────────────────────────────────

describe('formatFollowUp', () => {
  // Мокаем системное время на конкретную дату, чтобы тесты не зависели от запуска
  const FIXED_NOW = new Date(2026, 4, 10, 12, 0, 0); // 10 мая 2026, 12:00 локально

  function withFixedDate(fn: () => void) {
    const RealDate = globalThis.Date;
    const MockDate = class extends RealDate {
      constructor(...args: unknown[]) {
        if (args.length === 0) {
          super(FIXED_NOW.getTime());
        } else {
          super(...(args as ConstructorParameters<typeof RealDate>));
        }
      }
    } as typeof Date;
    MockDate.now = () => FIXED_NOW.getTime();
    globalThis.Date = MockDate;
    try {
      fn();
    } finally {
      globalThis.Date = RealDate;
    }
  }

  it('Сегодня', () => {
    withFixedDate(() => {
      expect(formatFollowUp('2026-05-10')).toBe('Сегодня');
    });
  });

  it('Завтра', () => {
    withFixedDate(() => {
      expect(formatFollowUp('2026-05-11')).toBe('Завтра');
    });
  });

  it('Вчера', () => {
    withFixedDate(() => {
      expect(formatFollowUp('2026-05-09')).toBe('Вчера');
    });
  });

  it('несколько дней назад — «N дн. назад»', () => {
    withFixedDate(() => {
      expect(formatFollowUp('2026-05-05')).toBe('5 дн. назад');
    });
  });

  it('будущая дата — локализованный формат «d mon»', () => {
    withFixedDate(() => {
      const result = formatFollowUp('2026-05-20');
      // Должна содержать число и месяц, не пустая
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toBe('Сегодня');
      expect(result).not.toBe('Завтра');
    });
  });
});
