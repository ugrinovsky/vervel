import { WorkoutStats } from '@/types/Analytics';

interface MuscleBalanceProps {
  period: 'week' | 'month' | 'year';
  data: WorkoutStats;
}

interface BalanceMetric {
  id: string;
  label: string;
  description: string;
  value: number;
  previousValue: number;
  status: 'good' | 'warning' | 'bad';
  details: {
    left: string;
    right: string;
    leftValue: number;
    rightValue: number;
  };
}

export default function MuscleBalance({ period }: MuscleBalanceProps) {
  const metrics: BalanceMetric[] = [
    {
      id: 'upper_lower',
      label: 'Верх/Низ',
      description: 'Баланс нагрузки между верхней и нижней частью тела',
      value: 85,
      previousValue: 80,
      status: 'good',
      details: {
        left: 'Верх',
        right: 'Низ',
        leftValue: 52,
        rightValue: 48,
      },
    },
    {
      id: 'front_back',
      label: 'Перед/Зад',
      description: 'Баланс между передними и задними мышечными группами',
      value: 72,
      previousValue: 68,
      status: 'warning',
      details: {
        left: 'Перед',
        right: 'Зад',
        leftValue: 58,
        rightValue: 42,
      },
    },
    {
      id: 'left_right',
      label: 'Лево/Право',
      description: 'Симметрия развития левой и правой сторон',
      value: 94,
      previousValue: 92,
      status: 'good',
      details: {
        left: 'Лево',
        right: 'Право',
        leftValue: 51,
        rightValue: 49,
      },
    },
    {
      id: 'push_pull',
      label: 'Тяни/Толкай',
      description: 'Соотношение тянущих и толкающих движений',
      value: 68,
      previousValue: 65,
      status: 'bad',
      details: {
        left: 'Тяни',
        right: 'Толкай',
        leftValue: 38,
        rightValue: 62,
      },
    },
  ];

  const getStatusColor = (status: BalanceMetric['status']) => {
    switch (status) {
      case 'good':
        return 'text-emerald-400';
      case 'warning':
        return 'text-yellow-400';
      case 'bad':
        return 'text-orange-400';
    }
  };

  const getStatusBgColor = (status: BalanceMetric['status']) => {
    switch (status) {
      case 'good':
        return 'bg-emerald-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'bad':
        return 'bg-orange-500';
    }
  };

  const getCircleColor = (id: string) => {
    switch (id) {
      case 'upper_lower':
        return 'text-emerald-600';
      case 'front_back':
        return 'text-emerald-500';
      case 'left_right':
        return 'text-emerald-400';
      case 'push_pull':
        return 'text-teal-400';
      default:
        return 'text-emerald-300';
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-[var(--color_text_muted)]">Симметрия развития</p>
        </div>
        <div className="text-xs px-3 py-1 rounded-full bg-[var(--color_bg_card)] text-[var(--color_text_secondary)]">
          {period === 'week' ? 'Нед' : period === 'month' ? 'Месяц' : 'Год'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {metrics.map((metric) => {
          const change = metric.value - metric.previousValue;
          const changeSign = change >= 0 ? '+' : '';

          return (
            <div key={metric.id} className="text-center">
              <div className="relative w-28 h-28 mx-auto mb-2">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#374151"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${metric.value}, 100`}
                    className={getCircleColor(metric.id)}
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-lg font-bold text-white">{metric.value}%</div>
                  <div className={`text-xs ${getStatusColor(metric.status)}`}>
                    {changeSign}
                    {change}%
                  </div>
                </div>

                <div
                  className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getStatusBgColor(
                    metric.status
                  )}`}
                />
              </div>

              <div className="text-sm text-white font-medium">{metric.label}</div>

              <div className="flex items-center justify-center gap-2 text-xs text-[var(--color_text_muted)] mt-1">
                <div className="text-left">
                  <div>{metric.details.left}</div>
                  <div className="text-white">{metric.details.leftValue}%</div>
                </div>
                <div className="h-4 w-px bg-[var(--color_border)]"></div>
                <div className="text-right">
                  <div>{metric.details.right}</div>
                  <div className="text-white">{metric.details.rightValue}%</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-[var(--color_text_secondary)]">Хорошо</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
          <span className="text-[var(--color_text_secondary)]">Норма</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
          <span className="text-[var(--color_text_secondary)]">Слабо</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--color_border)]">
        <div className="flex items-center justify-between">
          <div className="text-sm text-[var(--color_text_muted)]">Общий баланс</div>
          <div className="text-lg font-bold text-emerald-400">
            {Math.round(metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length)}%
          </div>
        </div>
        <div className="text-xs text-[var(--color_text_muted)] mt-1">Средний показатель баланса</div>
      </div>
    </>
  );
}
