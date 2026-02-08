// components/analytics/ActivityHeatmap.tsx
import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface ActivityHeatmapProps {
  period: 'week' | 'month' | 'year';
}

type ActivityLevel = 0 | 1 | 2 | 3 | 4; // 0 - нет тренировки, 4 - максимальная нагрузка

export default function ActivityHeatmap({ period }: ActivityHeatmapProps) {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  // Генерация демо данных
  const generateWeekData = (): ActivityLevel[] => {
    return Array.from({ length: 7 * 24 }, () =>
      Math.random() > 0.6 ? (Math.floor(Math.random() * 5) as ActivityLevel) : 0
    );
  };

  const generateMonthData = (): ActivityLevel[] => {
    return Array.from({ length: 31 }, () =>
      Math.random() > 0.4 ? (Math.floor(Math.random() * 5) as ActivityLevel) : 0
    );
  };

  const activityData = viewMode === 'week' ? generateWeekData() : generateMonthData();
  const columns = viewMode === 'week' ? 7 : 31;
  const rows = viewMode === 'week' ? 24 : 1;

  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const getActivityColor = (level: ActivityLevel) => {
    switch (level) {
      case 0:
        return 'bg-gray-800';
      case 1:
        return 'bg-green-900';
      case 2:
        return 'bg-green-700';
      case 3:
        return 'bg-yellow-600';
      case 4:
        return 'bg-red-600';
    }
  };

  const getActivityLabel = (level: ActivityLevel) => {
    switch (level) {
      case 0:
        return 'Нет тренировки';
      case 1:
        return 'Очень легко';
      case 2:
        return 'Легко';
      case 3:
        return 'Средне';
      case 4:
        return 'Интенсивно';
    }
  };

  const totalWorkouts = activityData.filter((level) => level > 0).length;
  const avgIntensity = activityData.reduce((sum, level) => sum + level, 0) / totalWorkouts || 0;

  return (
    <div className="glass p-5 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">Активность</h3>
          <p className="text-sm text-gray-400">Карта тренировок</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1 text-sm rounded-md transition ${
              viewMode === 'week' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Неделя
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1 text-sm rounded-md transition ${
              viewMode === 'month' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Месяц
          </button>
        </div>
      </div>

      {/* Heatmap сетка */}
      <div className="overflow-x-auto pb-4">
        <div className="inline-flex flex-col gap-1">
          {/* Заголовки дней/часов */}
          <div className="flex gap-1 mb-2">
            <div className="w-6"></div> {/* Пустая ячейка для часов */}
            {viewMode === 'week'
              ? days.map((day, i) => (
                  <div key={i} className="w-6 text-center text-xs text-gray-400">
                    {day}
                  </div>
                ))
              : Array.from({ length: columns }).map((_, i) => (
                  <div key={i} className="w-6 text-center text-xs text-gray-400">
                    {i + 1}
                  </div>
                ))}
          </div>

          {/* Строки данных */}
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex gap-1">
              {/* Метка часа/дня */}
              {viewMode === 'week' ? (
                <div className="w-6 text-xs text-gray-400 text-right pr-2">
                  {rowIndex.toString().padStart(2, '0')}:00
                </div>
              ) : null}

              {/* Ячейки активности */}
              {Array.from({ length: columns }).map((_, colIndex) => {
                const dataIndex = rowIndex * columns + colIndex;
                const level = activityData[dataIndex] || 0;

                return (
                  <div
                    key={colIndex}
                    className={`
                      w-6 h-6 rounded-sm transition-all duration-200
                      ${getActivityColor(level)}
                      hover:scale-110 hover:shadow-lg hover:z-10
                      relative group
                    `}
                    title={`${getActivityLabel(level)}`}
                  >
                    {/* Тулкит */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                      <div className="text-xs text-white font-medium">
                        {getActivityLabel(level)}
                      </div>
                      <div className="text-xs text-gray-400">Уровень: {level}/4</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Легенда */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-400">Интенсивность:</div>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`w-4 h-4 rounded-sm ${getActivityColor(level as ActivityLevel)}`}
                title={getActivityLabel(level as ActivityLevel)}
              ></div>
            ))}
          </div>
        </div>

        <div className="text-xs text-gray-400">Отсутствует → Интенсивно</div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="text-center p-3 bg-gray-800/30 rounded-lg">
          <div className="text-2xl font-bold text-blue-400">{totalWorkouts}</div>
          <div className="text-xs text-gray-400 mt-1">Всего тренировок</div>
        </div>
        <div className="text-center p-3 bg-gray-800/30 rounded-lg">
          <div className="text-2xl font-bold text-green-400">{avgIntensity.toFixed(1)}/4</div>
          <div className="text-xs text-gray-400 mt-1">Средняя интенсивность</div>
        </div>
      </div>

      {/* Навигация */}
      <div className="flex items-center justify-between mt-4">
        <button className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition">
          <ChevronLeftIcon className="w-4 h-4" />
          Предыдущая
        </button>
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <CalendarIcon className="w-4 h-4" />
          {viewMode === 'week' ? 'Эта неделя' : 'Этот месяц'}
        </div>
        <button className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition">
          Следующая
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
