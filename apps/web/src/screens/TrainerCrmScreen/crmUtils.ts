import type { LeadCrmStatus } from '@/api/trainer';
import { parseApiDateTime, parseLocalDate, toDateKey, today } from '@/utils/date';

type LeadForGrowth = { createdAt: string; crmStatus: LeadCrmStatus };

/** Счётчики по каждому CRM-статусу лида без небезопасных приведений типов */
export function countLeadsByCrmStatus(
  leads: readonly { crmStatus: LeadCrmStatus }[]
): Record<LeadCrmStatus, number> {
  return {
    new: leads.filter((l) => l.crmStatus === 'new').length,
    contacted: leads.filter((l) => l.crmStatus === 'contacted').length,
    trial: leads.filter((l) => l.crmStatus === 'trial').length,
    converted: leads.filter((l) => l.crmStatus === 'converted').length,
    lost: leads.filter((l) => l.crmStatus === 'lost').length,
  };
}

export type GrowthDataPoint = { label: string; total: number; converted: number };

/**
 * Строит накопленный ряд «рост базы» по дням (span < 21 дн.) или по неделям.
 * Каждый элемент — кумулятивное количество лидов и конвертированных на дату/неделю.
 */
export function computeGrowthData(leads: LeadForGrowth[]): GrowthDataPoint[] {
  if (leads.length === 0) return [];

  const sorted = [...leads].sort(
    (a, b) => parseApiDateTime(a.createdAt).getTime() - parseApiDateTime(b.createdAt).getTime()
  );

  const spanDays =
    (parseApiDateTime(sorted[sorted.length - 1].createdAt).getTime() -
      parseApiDateTime(sorted[0].createdAt).getTime()) /
    86400000;

  const useDay = spanDays < 21;
  const buckets: Record<string, { total: number; converted: number }> = {};

  sorted.forEach((l) => {
    const d = parseApiDateTime(l.createdAt);
    let key: string;
    if (useDay) {
      key = toDateKey(d);
    } else {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay() + 1); // Monday
      key = toDateKey(weekStart);
    }
    if (!buckets[key]) buckets[key] = { total: 0, converted: 0 };
    buckets[key].total += 1;
    if (l.crmStatus === 'converted') buckets[key].converted += 1;
  });

  let cumTotal = 0;
  let cumConverted = 0;
  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => {
      cumTotal += v.total;
      cumConverted += v.converted;
      const label = parseLocalDate(key).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
      });
      return { label, total: cumTotal, converted: cumConverted };
    });
}

/**
 * Форматирует дату follow-up относительно сегодня.
 * dateStr — дата в формате «YYYY-MM-DD» или API datetime.
 */
export function formatFollowUp(dateStr: string): string {
  const date = parseApiDateTime(dateStr);
  const todayDate = today();
  const d = parseLocalDate(toDateKey(date));
  const diff = Math.round((d.getTime() - todayDate.getTime()) / 86400000);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Завтра';
  if (diff === -1) return 'Вчера';
  if (diff < 0) return `${Math.abs(diff)} дн. назад`;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
