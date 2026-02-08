// components/analytics/Recommendations.tsx
import { useState } from 'react';
import {
  LightBulbIcon,
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

interface RecommendationsProps {
  period: 'week' | 'month' | 'year';
}

interface Recommendation {
  id: string;
  type: 'focus' | 'improvement' | 'achievement' | 'warning';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
  estimatedTime?: string;
  completed: boolean;
  muscleGroups?: string[];
}

export default function Recommendations({ period }: RecommendationsProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  const recommendations: Recommendation[] = [
    {
      id: '1',
      type: 'focus',
      title: 'Фокус на отстающие мышцы',
      description:
        'Бицепсы и предплечья отстают на 20% от остальных групп. Рекомендуем добавить 2-3 упражнения в неделю.',
      priority: 'high',
      action: 'Добавить сгибания рук со штангой',
      estimatedTime: '15 мин',
      completed: false,
      muscleGroups: ['Бицепсы', 'Предплечья'],
    },
    {
      id: '2',
      type: 'improvement',
      title: 'Увеличить объем на ноги',
      description:
        'Нижняя часть тела получает на 30% меньше нагрузки, чем верхняя. Сбалансируйте тренировки.',
      priority: 'medium',
      action: 'Добавить выпады и румынскую тягу',
      estimatedTime: '20 мин',
      completed: false,
      muscleGroups: ['Квадрицепсы', 'Бицепсы бедра', 'Ягодицы'],
    },
    {
      id: '3',
      type: 'achievement',
      title: 'Отличный прогресс!',
      description:
        'Грудь и плечи хорошо развиты, прогресс за месяц составил +12%. Продолжайте в том же духе.',
      priority: 'low',
      completed: false,
      muscleGroups: ['Грудь', 'Плечи'],
    },
    {
      id: '4',
      type: 'warning',
      title: 'Дисбаланс "тяни/толкай"',
      description: 'Толкающих упражнений на 25% больше, чем тянущих. Это может привести к осанке.',
      priority: 'high',
      action: 'Добавить тягу штанги в наклоне',
      estimatedTime: '15 мин',
      completed: false,
      muscleGroups: ['Спина', 'Задние дельты'],
    },
    {
      id: '5',
      type: 'focus',
      title: 'Следующая тренировка',
      description: 'Запланируйте тренировку на спину и ноги для поддержания баланса.',
      priority: 'medium',
      action: 'Создать тренировку',
      estimatedTime: '60 мин',
      completed: true,
      muscleGroups: ['Спина', 'Ноги'],
    },
  ];

  const getTypeColor = (type: Recommendation['type']) => {
    switch (type) {
      case 'focus':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'improvement':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'achievement':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  const getTypeIcon = (type: Recommendation['type']) => {
    switch (type) {
      case 'focus':
        return '🎯';
      case 'improvement':
        return '📈';
      case 'achievement':
        return '🏆';
      case 'warning':
        return '⚠️';
    }
  };

  const getPriorityColor = (priority: Recommendation['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
    }
  };

  const filteredRecs = showCompleted
    ? recommendations
    : recommendations.filter((rec) => !rec.completed);

  const completedCount = recommendations.filter((rec) => rec.completed).length;
  const highPriorityCount = recommendations.filter(
    (rec) => rec.priority === 'high' && !rec.completed
  ).length;

  return (
    <div className="glass p-5 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <LightBulbIcon className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-bold text-white">Рекомендации</h3>
          </div>
          <p className="text-sm text-gray-400">Персональные советы</p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`px-2 py-1 rounded-full text-xs ${highPriorityCount > 0 ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-400'}`}
          >
            {highPriorityCount} важных
          </div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`px-3 py-1 text-sm rounded-md transition ${
              showCompleted ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {showCompleted ? 'Скрыть выполненные' : `Показать (${completedCount})`}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredRecs.map((rec) => (
          <div
            key={rec.id}
            className={`
              p-4 rounded-xl border transition-all duration-200
              ${getTypeColor(rec.type)}
              ${rec.completed ? 'opacity-60' : 'hover:scale-[1.02] hover:shadow-lg'}
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="text-xl">{getTypeIcon(rec.type)}</div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-white">{rec.title}</h4>
                    {rec.priority === 'high' && !rec.completed && (
                      <div
                        className={`
                        w-2 h-2 rounded-full animate-pulse
                        ${getPriorityColor(rec.priority)}
                      `}
                      ></div>
                    )}
                    {rec.completed && <CheckIcon className="w-4 h-4 text-green-400" />}
                  </div>

                  <p className="text-sm text-gray-300 mb-3">{rec.description}</p>

                  {/* Мышечные группы */}
                  {rec.muscleGroups && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {rec.muscleGroups.map((muscle) => (
                        <span
                          key={muscle}
                          className="px-2 py-1 text-xs bg-gray-800/50 rounded-full text-gray-300"
                        >
                          {muscle}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Действие и время */}
                  {(rec.action || rec.estimatedTime) && !rec.completed && (
                    <div className="flex items-center gap-4 text-sm">
                      {rec.action && (
                        <div className="flex items-center gap-1 text-blue-400">
                          <ArrowRightIcon className="w-3 h-3" />
                          <span>{rec.action}</span>
                        </div>
                      )}
                      {rec.estimatedTime && (
                        <div className="flex items-center gap-1 text-gray-400">
                          <ClockIcon className="w-3 h-3" />
                          <span>{rec.estimatedTime}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {!rec.completed && (
                <button className="text-xs text-gray-400 hover:text-white transition">...</button>
              )}
            </div>

            {/* Прогресс выполнения */}
            {rec.completed && (
              <div className="mt-3 pt-3 border-t border-gray-700/50">
                <div className="text-xs text-green-400 flex items-center gap-1">
                  <CheckIcon className="w-3 h-3" />
                  Выполнено
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Статистика рекомендаций */}
      <div className="mt-6 pt-4 border-t border-gray-800">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xl font-bold text-white">{filteredRecs.length}</div>
            <div className="text-xs text-gray-400">Всего</div>
          </div>
          <div>
            <div className="text-xl font-bold text-yellow-400">{highPriorityCount}</div>
            <div className="text-xs text-gray-400">Важные</div>
          </div>
          <div>
            <div className="text-xl font-bold text-green-400">{completedCount}</div>
            <div className="text-xs text-gray-400">Выполнено</div>
          </div>
        </div>

        {filteredRecs.length === 0 && (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">🎉</div>
            <div className="text-gray-300">Все рекомендации выполнены!</div>
          </div>
        )}
      </div>
    </div>
  );
}
