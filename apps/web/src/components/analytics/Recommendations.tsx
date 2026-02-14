import { LightBulbIcon, ClockIcon } from '@heroicons/react/24/outline';
import { getZoneLabel } from '@/util/zones';
import { generateRecommendations } from '@/util/getRecomendations';
import { WorkoutStats } from '@/types/Analytics';

export interface Recommendation {
  id: string;
  type: 'focus' | 'improvement' | 'achievement' | 'warning';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime?: string;
  muscleGroups?: string[];
}

interface RecommendationsProps {
  stats: WorkoutStats;
}

export default function Recommendations({ stats }: RecommendationsProps) {
  const recommendations = generateRecommendations(stats);

  const getTypeColor = (type: Recommendation['type']) => {
    switch (type) {
      case 'focus':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
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

  const highPriorityCount = recommendations.filter((rec) => rec.priority === 'high').length;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <LightBulbIcon className="w-5 h-5 text-yellow-400 shrink-0" />
          <div>
            <p className="text-sm text-[var(--color_text_muted)]">Персональные советы</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`px-2 py-1 rounded-full text-xs ${
              highPriorityCount > 0 ? 'bg-red-500/20 text-red-400' : 'bg-[var(--color_bg_card)] text-[var(--color_text_muted)]'
            }`}
          >
            {highPriorityCount} важных
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className={`
              p-4 rounded-xl border transition-all duration-200
              ${getTypeColor(rec.type)}
              hover:scale-[1.02] hover:shadow-lg
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="text-xl">{getTypeIcon(rec.type)}</div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-white leading-tight">{rec.title}</h4>
                    {rec.priority === 'high' && (
                      <div
                        className={`w-2 h-2 rounded-full animate-pulse ${getPriorityColor(
                          rec.priority
                        )}`}
                      ></div>
                    )}
                  </div>

                  <p className="text-sm text-[var(--color_text_secondary)] mb-3">{rec.description}</p>

                  {rec.muscleGroups && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {rec.muscleGroups.map((muscle) => (
                        <span
                          key={muscle}
                          className="px-2 py-1 text-xs bg-[var(--color_bg_card)]/50 rounded-full text-[var(--color_text_secondary)]"
                        >
                          {getZoneLabel(muscle)}
                        </span>
                      ))}
                    </div>
                  )}

                  {rec.estimatedTime && (
                    <div className="flex items-center gap-4 text-sm">
                      {rec.estimatedTime && (
                        <div className="flex items-center gap-1 text-[var(--color_text_muted)]">
                          <ClockIcon className="w-3 h-3" />
                          <span>{rec.estimatedTime}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-[var(--color_border)]">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xl font-bold text-white">{recommendations.length}</div>
            <div className="text-xs text-[var(--color_text_muted)]">Всего</div>
          </div>
          <div>
            <div className="text-xl font-bold text-yellow-400">{highPriorityCount}</div>
            <div className="text-xs text-[var(--color_text_muted)]">Важные</div>
          </div>
        </div>
      </div>
    </>
  );
}
