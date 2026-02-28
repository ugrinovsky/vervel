import { WorkoutStats } from '@/types/Analytics';

interface MuscleBalanceProps {
  period: 'week' | 'month' | 'year';
  data: WorkoutStats;
}

// Группировка зон по паттернам движения
const UPPER_ZONES = ['chests', 'triceps', 'shoulders', 'biceps', 'backMuscles', 'trapezoids', 'forearms'];
const LOWER_ZONES = ['legMuscles', 'calfMuscles', 'glutes'];
const FRONT_ZONES = ['chests', 'triceps', 'shoulders', 'abdominalPress', 'obliquePress', 'core'];
const BACK_ZONES = ['backMuscles', 'trapezoids', 'biceps', 'glutes'];
const PUSH_ZONES = ['chests', 'triceps', 'shoulders'];
const PULL_ZONES = ['backMuscles', 'biceps', 'trapezoids', 'forearms'];

function sumZones(zones: Record<string, number>, keys: string[]) {
  return keys.reduce((s, k) => s + (zones[k] ?? 0), 0);
}

function calcBalance(a: number, b: number): { pct: number; aShare: number; bShare: number; status: 'good' | 'warning' | 'bad' } {
  const total = a + b;
  if (total === 0) return { pct: 100, aShare: 50, bShare: 50, status: 'good' };
  const aShare = Math.round((a / total) * 100);
  const bShare = 100 - aShare;
  const deviation = Math.abs(50 - aShare); // 0 = perfect, 50 = all on one side
  const pct = Math.round(100 - deviation * 2);
  const status = deviation < 10 ? 'good' : deviation < 20 ? 'warning' : 'bad';
  return { pct, aShare, bShare, status };
}

export default function MuscleBalance({ period, data }: MuscleBalanceProps) {
  const zones = data?.zones ?? {};

  const upper = sumZones(zones, UPPER_ZONES);
  const lower = sumZones(zones, LOWER_ZONES);
  const front = sumZones(zones, FRONT_ZONES);
  const back = sumZones(zones, BACK_ZONES);
  const push = sumZones(zones, PUSH_ZONES);
  const pull = sumZones(zones, PULL_ZONES);

  const noData = upper + lower + front + back + push + pull === 0;

  const ul = calcBalance(upper, lower);
  const fb = calcBalance(front, back);
  const pp = calcBalance(push, pull);

  const overallBalance = Math.round((ul.pct + fb.pct + pp.pct) / 3);

  const metrics = [
    {
      id: 'upper_lower',
      label: 'Верх/Низ',
      description: 'Нагрузка между верхней и нижней частью тела',
      ...ul,
      details: { left: 'Верх', right: 'Низ', leftValue: ul.aShare, rightValue: ul.bShare },
    },
    {
      id: 'front_back',
      label: 'Перед/Зад',
      description: 'Баланс передних и задних мышечных групп',
      ...fb,
      details: { left: 'Перед', right: 'Зад', leftValue: fb.aShare, rightValue: fb.bShare },
    },
    {
      id: 'push_pull',
      label: 'Тяни/Толкай',
      description: 'Соотношение тянущих и толкающих движений',
      ...pp,
      details: { left: 'Толкай', right: 'Тяни', leftValue: pp.aShare, rightValue: pp.bShare },
    },
  ];


  if (noData) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
        <span className="text-4xl">⚖️</span>
        <p className="text-sm text-(--color_text_muted)">Недостаточно данных для анализа баланса</p>
        <p className="text-xs text-(--color_text_muted)/60">Добавьте больше тренировок с разными группами мышц</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-(--color_text_muted)">Симметрия развития</p>
        <div className="text-xs px-3 py-1 rounded-full bg-(--color_bg_card) text-(--color_text_secondary)">
          {period === 'week' ? 'Нед' : period === 'month' ? 'Месяц' : 'Год'}
        </div>
      </div>

      {/* 3 rings */}
      <div className="grid grid-cols-3 gap-3">
        {metrics.map((metric) => (
          <div key={metric.id} className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-2">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={metric.status === 'good' ? 'var(--color_primary_light)' : metric.status === 'warning' ? '#fbbf24' : '#f87171'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${metric.pct}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base font-bold text-white">{metric.pct}%</span>
              </div>
            </div>
            <div className="text-xs font-medium text-white">{metric.label}</div>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-(--color_text_muted) mt-1">
              <span>{metric.details.leftValue}%</span>
              <span className="opacity-40">/</span>
              <span>{metric.details.rightValue}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Details */}
      <div className="space-y-2">
        {metrics.map((metric) => (
          <div key={metric.id} className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border)">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">{metric.label}</span>
              <span className={`text-xs font-semibold ${metric.status === 'good' ? 'text-emerald-400' : metric.status === 'warning' ? 'text-amber-400' : 'text-red-400'}`}>
                {metric.pct}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-(--color_text_muted) w-12 text-right">{metric.details.left} {metric.details.leftValue}%</span>
              <div className="flex-1 flex h-2 rounded-full overflow-hidden gap-0.5">
                <div
                  className="h-full rounded-l-full"
                  style={{ width: `${metric.details.leftValue}%`, backgroundColor: 'var(--color_primary_light)', opacity: 0.8 }}
                />
                <div
                  className="h-full rounded-r-full"
                  style={{ width: `${metric.details.rightValue}%`, backgroundColor: 'var(--color-amber-400)', opacity: 0.8 }}
                />
              </div>
              <span className="text-[11px] text-(--color_text_muted) w-12">{metric.details.right} {metric.details.rightValue}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Legend + overall */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex gap-3 text-xs text-(--color_text_muted)">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Хорошо</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Норма</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Слабо</span>
        </div>
        <div className="text-sm font-bold text-emerald-400">{overallBalance}%</div>
      </div>
    </div>
  );
}
