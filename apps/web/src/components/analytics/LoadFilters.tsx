// components/analytics/LoadFilters.tsx
import { useState } from 'react';
import {
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  ArrowsUpDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface LoadFiltersProps {
  period: 'week' | 'month' | 'year';
}

type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'all';
type WorkoutType = 'strength' | 'cardio' | 'crossfit' | 'recovery' | 'all';
type IntensityLevel = 'low' | 'medium' | 'high' | 'all';

interface FilterState {
  muscleGroup: MuscleGroup;
  workoutType: WorkoutType;
  intensity: IntensityLevel;
  showEmptyDays: boolean;
  showOnlyWithVolume: boolean;
}

export default function LoadFilters({ period }: LoadFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    muscleGroup: 'all',
    workoutType: 'all',
    intensity: 'all',
    showEmptyDays: true,
    showOnlyWithVolume: false,
  });

  const muscleGroups = [
    { id: 'all', label: 'Все группы', color: 'bg-gray-500' },
    { id: 'chest', label: 'Грудь', color: 'bg-red-500' },
    { id: 'back', label: 'Спина', color: 'bg-blue-500' },
    { id: 'legs', label: 'Ноги', color: 'bg-green-500' },
    { id: 'shoulders', label: 'Плечи', color: 'bg-yellow-500' },
    { id: 'arms', label: 'Руки', color: 'bg-purple-500' },
    { id: 'core', label: 'Пресс', color: 'bg-pink-500' },
  ];

  const workoutTypes = [
    { id: 'all', label: 'Все типы', icon: '🏋️' },
    { id: 'strength', label: 'Силовые', icon: '💪' },
    { id: 'cardio', label: 'Кардио', icon: '🏃' },
    { id: 'crossfit', label: 'Кроссфит', icon: '⚡' },
    { id: 'recovery', label: 'Восстановление', icon: '🧘' },
  ];

  const intensityLevels = [
    { id: 'all', label: 'Любая', color: 'bg-gray-600' },
    { id: 'low', label: 'Низкая', color: 'bg-green-600' },
    { id: 'medium', label: 'Средняя', color: 'bg-yellow-600' },
    { id: 'high', label: 'Высокая', color: 'bg-red-600' },
  ];

  // Статистика по фильтрам
  const filterStats = {
    low: 3,
    medium: 5,
    high: 2,
    chest: 4,
    back: 3,
    legs: 2,
    shoulders: 1,
    arms: 1,
    core: 0,
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      muscleGroup: 'all',
      workoutType: 'all',
      intensity: 'all',
      showEmptyDays: true,
      showOnlyWithVolume: false,
    });
  };

  const appliedFiltersCount = Object.values(filters).filter(
    (value) => value !== 'all' && value !== true && value !== false
  ).length;

  return (
    <div className="glass p-5 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-bold text-white">Фильтры нагрузки</h3>
          </div>
          <p className="text-sm text-gray-400">Настройте отображение данных</p>
        </div>

        <div className="flex items-center gap-2">
          {appliedFiltersCount > 0 && (
            <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full">
              {appliedFiltersCount}
            </span>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`p-2 rounded-lg transition ${
              isOpen ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <AdjustmentsHorizontalIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Кнопки быстрых фильтров */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => handleFilterChange('intensity', 'high')}
          className={`px-3 py-2 text-sm rounded-lg transition flex items-center gap-2 ${
            filters.intensity === 'high'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          Высокая нагрузка
          <span className="text-xs text-gray-400">({filterStats.high})</span>
        </button>

        <button
          onClick={() => handleFilterChange('muscleGroup', 'chest')}
          className={`px-3 py-2 text-sm rounded-lg transition flex items-center gap-2 ${
            filters.muscleGroup === 'chest'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          Грудь
          <span className="text-xs text-gray-400">({filterStats.chest})</span>
        </button>

        <button
          onClick={() => handleFilterChange('workoutType', 'strength')}
          className={`px-3 py-2 text-sm rounded-lg transition flex items-center gap-2 ${
            filters.workoutType === 'strength'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          💪 Силовые
        </button>
      </div>

      {/* Расширенные фильтры */}
      {isOpen && (
        <div className="space-y-6 animate-fade-in">
          {/* Фильтр по мышечным группам */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-500 rounded"></div>
              Мышечные группы
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {muscleGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => handleFilterChange('muscleGroup', group.id)}
                  className={`
                    p-3 rounded-lg text-sm transition text-left
                    ${
                      filters.muscleGroup === group.id
                        ? 'bg-gray-700 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3 h-3 rounded-full ${group.color}`}></div>
                    <span>{group.label}</span>
                  </div>
                  {group.id !== 'all' && (
                    <div className="text-xs text-gray-400">
                      {filterStats[group.id as keyof typeof filterStats]} тренировок
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Фильтр по типу тренировки */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <div className="w-1 h-4 bg-purple-500 rounded"></div>
              Тип тренировки
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {workoutTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleFilterChange('workoutType', type.id)}
                  className={`
                    p-3 rounded-lg text-sm transition
                    ${
                      filters.workoutType === type.id
                        ? 'bg-gray-700 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{type.icon}</span>
                    <span>{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Фильтр по интенсивности */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <div className="w-1 h-4 bg-red-500 rounded"></div>
              Уровень нагрузки
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {intensityLevels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => handleFilterChange('intensity', level.id)}
                  className={`
                    p-3 rounded-lg text-sm transition flex items-center gap-2
                    ${
                      filters.intensity === level.id
                        ? 'bg-gray-700 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }
                  `}
                >
                  <div className={`w-3 h-3 rounded-full ${level.color}`}></div>
                  <span>{level.label}</span>
                  {level.id !== 'all' && (
                    <span className="text-xs text-gray-400 ml-auto">{filterStats[level.id]}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Дополнительные опции */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showEmptyDays}
                onChange={(e) => handleFilterChange('showEmptyDays', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div>
                <div className="text-sm text-white">Показывать пустые дни</div>
                <div className="text-xs text-gray-400">Дни без тренировок</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showOnlyWithVolume}
                onChange={(e) => handleFilterChange('showOnlyWithVolume', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div>
                <div className="text-sm text-white">Только с объемом</div>
                <div className="text-xs text-gray-400">Измеренная нагрузка</div>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Сводка фильтров */}
      <div className="mt-6 pt-4 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400">Активные фильтры:</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {filters.muscleGroup !== 'all' && (
                <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full">
                  {muscleGroups.find((g) => g.id === filters.muscleGroup)?.label}
                </span>
              )}
              {filters.workoutType !== 'all' && (
                <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded-full">
                  {workoutTypes.find((t) => t.id === filters.workoutType)?.label}
                </span>
              )}
              {filters.intensity !== 'all' && (
                <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full">
                  {intensityLevels.find((l) => l.id === filters.intensity)?.label}
                </span>
              )}
              {!filters.showEmptyDays && (
                <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">
                  Без пустых дней
                </span>
              )}
              {filters.showOnlyWithVolume && (
                <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">
                  С объемом
                </span>
              )}
            </div>
          </div>

          <button
            onClick={resetFilters}
            className="px-3 py-2 text-sm text-gray-400 hover:text-white transition flex items-center gap-1"
          >
            <XMarkIcon className="w-4 h-4" />
            Сбросить
          </button>
        </div>
      </div>
    </div>
  );
}
