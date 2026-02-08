interface StatsOverviewProps {
  period: 'week' | 'month' | 'year';
}

export default function StatsOverview({ period }: StatsOverviewProps) {
  // Здесь будет запрос к API за данными
  const stats = {
    totalLoad: 87,
    workoutsCount: 5,
    averageIntensity: 72,
    mostLoadedMuscle: { name: 'Грудь', value: 92 },
  };

  const periodLabel = period === 'week' ? 'неделю' : period === 'month' ? 'месяц' : 'год';

  return (
    <div className="glass p-4 rounded-xl">
      <h3 className="text-lg font-bold mb-3 text-white">Статистика нагрузки</h3>

      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-300">Общая нагрузка</span>
          <span className="text-yellow-400 font-semibold">{stats.totalLoad}%</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-300">Тренировок за {periodLabel}</span>
          <span className="text-blue-400 font-semibold">{stats.workoutsCount}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-300">Средняя интенсивность</span>
          <span className="text-green-400 font-semibold">{stats.averageIntensity}%</span>
        </div>

        <div className="pt-2 border-t border-gray-700">
          <div className="text-sm text-gray-400">Самая нагруженная:</div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-white">
              {stats.mostLoadedMuscle.name} - {stats.mostLoadedMuscle.value}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
