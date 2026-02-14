import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import muscleZones from './manZones';
import { avatarApi } from '@/api/avatar';

interface BodySVGProps {
  activeZones?: string[];
  onZoneClick?: (zoneName: string) => void;
  zoneIntensities?: Record<string, number>; // 0-1
  showIntensity?: boolean;
}

const BodySVG: React.FC<BodySVGProps> = ({
  activeZones = [],
  onZoneClick,
  showIntensity = true,
}) => {
  const [isAnimating, setIsAnimating] = useState(true);
  const [showFill, setShowFill] = useState(false);
  const [zoneIntensities, setZoneIntensities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const DEFAULT_ZONE_STROKE = 'rgba(255, 255, 255, 0.15)';
  const ACTIVE_ZONE_STROKE = 'rgba(255, 50, 50, 0.9)';

  const loadAvatarStats = async () => {
    try {
      setLoading(true);
      const response = await avatarApi.getZoneIntensities({ period: 'week' });
      if (response.data.success) {
        setZoneIntensities(response.data.data.zones);
      }
    } catch (error) {
      console.error('Failed to load avatar stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showIntensity) {
      loadAvatarStats();
    }
  }, [showIntensity]);

  useEffect(() => {
    const drawTimer = setTimeout(() => {
      setShowFill(true);
    }, 1000);

    const endTimer = setTimeout(() => {
      setIsAnimating(false);
    }, 1500);

    return () => {
      clearTimeout(drawTimer);
      clearTimeout(endTimer);
    };
  }, []);

  const getFillColor = (zoneName: string) => {
    // Используем переданные данные или загруженные
    const intensities = zoneIntensities;
    const intensity = intensities[zoneName] || 0;

    if (showIntensity && intensity > 0) {
      // Градиент от зеленого (0) до красного (1)
      const hue = 120 - intensity * 120; // 120 (зеленый) → 0 (красный)
      const saturation = 70;
      const lightness = 50;
      const alpha = 0.3 + intensity * 0.5; // Прозрачность зависит от интенсивности

      return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
    }

    if (activeZones.includes(zoneName)) {
      return 'rgba(255, 100, 100, 0.6)';
    }

    return 'transparent';
  };

  const getStrokeColor = (zoneName: string) => {
    if (activeZones.includes(zoneName)) {
      return ACTIVE_ZONE_STROKE;
    }

    const intensities = zoneIntensities;
    const intensity = intensities[zoneName] || 0;

    if (showIntensity && intensity > 0) {
      // Делаем контур более заметным для нагруженных зон
      return `rgba(255, 255, 255, ${0.1 + intensity * 0.2})`;
    }

    return DEFAULT_ZONE_STROKE;
  };

  const getStrokeWidth = () => {
    return 3;
  };

  const handleZoneClick = (zoneName: string) => {
    const intensities = zoneIntensities;
    const intensity = intensities[zoneName] || 0;

    console.log('Клик по зоне:', zoneName, 'Интенсивность:', Math.round(intensity * 100) + '%');

    if (onZoneClick) {
      onZoneClick(zoneName);
    }
  };

  const bodyZone = muscleZones.find((z) => z.name === 'body');
  const muscleZonesWithoutBody = muscleZones.filter((z) => z.name !== 'body');

  // Обновляем легенду с реальными данными
  const getIntensityLegend = () => {
    const intensities = Object.values(zoneIntensities);
    const loadedZones = intensities.filter((i) => i > 0).length;

    return (
      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs p-2 rounded">
        <div className="font-medium mb-1">Нагрузка за неделю:</div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-sm bg-green-500"></div>
          <span>Низкая ({'<'}33%)</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-sm bg-yellow-500"></div>
          <span>Средняя (33-66%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-red-500"></div>
          <span>Высокая ({'>'}66%)</span>
        </div>
        <div className="mt-2 pt-2 border-t border-[var(--color_border_light)] text-xs text-[var(--color_text_secondary)]">
          Нагружено зон: {loadedZones}
        </div>
      </div>
    );
  };

  return (
    <div className="avatar-wrapper glass mb-5 md:mb-0 md:mr-5 relative">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        version="1.1"
        viewBox="218.465 354.786 281.446 720.395"
        className="w-full h-full"
        style={{ pointerEvents: 'all' }}
      >
        {/* Хитбоксы для кликов */}
        {muscleZonesWithoutBody.map((zone) => (
          <g key={`hitbox-${zone.name}`}>
            {zone.paths.map((path, index) => (
              <path
                key={`hitbox-${zone.name}-${index}`}
                d={path}
                fill="transparent"
                stroke="transparent"
                strokeWidth="20"
                strokeLinecap="round"
                strokeLinejoin="round"
                onClick={() => handleZoneClick(zone.name)}
                onMouseEnter={(e) => (e.currentTarget.style.stroke = 'rgba(255,255,255,0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.stroke = 'transparent')}
                style={{
                  cursor: 'pointer',
                  pointerEvents: 'all',
                }}
              />
            ))}
          </g>
        ))}

        {/* Контур тела */}
        {bodyZone &&
          bodyZone.paths.map((path, index) => (
            <motion.path
              key={`body-${index}`}
              d={path}
              fill="none"
              stroke="rgb(176 255 245 / 60%)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
            />
          ))}

        {/* Анимация рисования контуров зон */}
        {muscleZonesWithoutBody.map((zone, zoneIndex) => (
          <g key={`outline-${zone.name}`}>
            {zone.paths.map((path, pathIndex) => (
              <motion.path
                key={`outline-${zone.name}-${pathIndex}`}
                d={path}
                fill="none"
                stroke={DEFAULT_ZONE_STROKE}
                strokeWidth={0.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  pathLength: {
                    duration: 1,
                    delay: zoneIndex * 0.03,
                    ease: 'easeInOut',
                  },
                }}
                style={{ pointerEvents: 'none' }}
              />
            ))}
          </g>
        ))}

        {/* Постоянные контуры зон (после анимации) */}
        {!isAnimating &&
          muscleZonesWithoutBody.map((zone) => {
            const strokeColor = getStrokeColor(zone.name);
            const strokeWidth = getStrokeWidth(zone.name);

            return (
              <g key={`permanent-outline-${zone.name}`}>
                {zone.paths.map((path, index) => (
                  <path
                    key={`permanent-outline-${zone.name}-${index}`}
                    d={path}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ pointerEvents: 'none' }}
                  />
                ))}
              </g>
            );
          })}

        {/* Заливка зон (появляется после контуров) */}
        {showFill &&
          muscleZonesWithoutBody.map((zone) => {
            const fillColor = getFillColor(zone.name);

            return (
              <g key={`fill-${zone.name}`}>
                {zone.paths.map((path, index) => (
                  <motion.path
                    key={`fill-${zone.name}-${index}`}
                    d={path}
                    fill={fillColor}
                    stroke="none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      duration: 0.5,
                      delay: 0.1,
                      ease: 'easeInOut',
                    }}
                    className="transition-all duration-300"
                    style={{
                      pointerEvents: 'none',
                    }}
                  />
                ))}
              </g>
            );
          })}
      </svg>

      {showIntensity && getIntensityLegend()}

      {activeZones.length > 0 && (
        <div className="absolute bottom-2 left-2 bg-red-500 text-white text-xs px-3 py-1 rounded-full shadow">
          Выбрано: {activeZones.length}
        </div>
      )}

      <div className="glass p-4 rounded-lg w-64">
        <h3 className="text-lg font-bold mb-3 text-white">Статистика нагрузки</h3>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-[var(--color_text_secondary)]">Общая нагрузка</span>
            <span className="text-yellow-400 font-semibold">87%</span>
          </div>

          <div className="flex justify-between">
            <span className="text-[var(--color_text_secondary)]">Тренировок за неделю</span>
            <span className="text-blue-400 font-semibold">5</span>
          </div>

          <div className="flex justify-between">
            <span className="text-[var(--color_text_secondary)]">Средняя интенсивность</span>
            <span className="text-green-400 font-semibold">72%</span>
          </div>

          <div className="pt-2 border-t border-[var(--color_border)]">
            <div className="text-sm text-[var(--color_text_muted)]">Самая нагруженная:</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-white">Грудь - 92%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="glass p-4 rounded-lg w-64">
        <h3 className="text-lg font-bold mb-3 text-white">Топ мышц недели</h3>

        <div className="space-y-2">
          {['chests', 'legMuscles', 'backMuscles', 'shoulders', 'triceps'].map((muscle, index) => (
            <div key={muscle} className="flex items-center gap-3">
              <div className="w-6 h-6 flex items-center justify-center bg-[var(--color_bg_card)] rounded-full">
                <span className="text-xs font-bold">{index + 1}</span>
              </div>

              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-white capitalize">
                    {muscle === 'chests'
                      ? 'Грудь'
                      : muscle === 'legMuscles'
                        ? 'Ноги'
                        : muscle === 'backMuscles'
                          ? 'Спина'
                          : muscle === 'shoulders'
                            ? 'Плечи'
                            : 'Трицепс'}
                  </span>
                  <span className="text-yellow-400 text-sm font-semibold">
                    {Math.round(Math.random() * 30 + 70)}%
                  </span>
                </div>

                <div className="h-1.5 bg-[var(--color_border)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-yellow-500 rounded-full"
                    style={{ width: `${Math.round(Math.random() * 30 + 70)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass p-4 rounded-lg w-64">
        <h3 className="text-lg font-bold mb-3 text-white">Баланс мышц</h3>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Верх/Низ', value: 85, color: 'bg-blue-500' },
            { label: 'Перед/Зад', value: 72, color: 'bg-purple-500' },
            { label: 'Лево/Право', value: 94, color: 'bg-green-500' },
            { label: 'Тяни/Толкай', value: 68, color: 'bg-red-500' },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-2">
                <svg className="w-full h-full" viewBox="0 0 36 36">
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
                    strokeDasharray={`${item.value}, 100`}
                    className={item.color.replace('bg-', 'text-')}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold">{item.value}%</span>
                </div>
              </div>
              <span className="text-sm text-[var(--color_text_secondary)]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass p-4 rounded-lg w-64">
        <h3 className="text-lg font-bold mb-3 text-white">Активность</h3>

        <div className="grid grid-cols-7 gap-1 mb-3">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
            <div key={day} className="text-center text-xs text-[var(--color_text_muted)]">
              {day}
            </div>
          ))}

          {Array.from({ length: 28 }).map((_, i) => {
            const hasWorkout = Math.random() > 0.4;
            const intensity = hasWorkout ? Math.floor(Math.random() * 4) : 0;

            return (
              <div
                key={i}
                className={`h-6 rounded text-xs flex items-center justify-center ${
                  intensity === 0
                    ? 'bg-[var(--color_bg_card)]'
                    : intensity === 1
                      ? 'bg-green-900'
                      : intensity === 2
                        ? 'bg-yellow-900'
                        : 'bg-red-900'
                }`}
              >
                {hasWorkout && <span className="text-white">●</span>}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-900 rounded"></div>
            <span className="text-[var(--color_text_secondary)]">Легко</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-900 rounded"></div>
            <span className="text-[var(--color_text_secondary)]">Интенсивно</span>
          </div>
        </div>
      </div>

      <div className="glass p-4 rounded-lg w-64">
        <h3 className="text-lg font-bold mb-3 text-white">Рекомендации</h3>

        <div className="space-y-3">
          <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-700/50">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-blue-300 font-semibold">Фокус на отстающие</span>
            </div>
            <p className="text-sm text-[var(--color_text_secondary)]">Добавьте упражнения на бицепс и предплечья</p>
          </div>

          <div className="p-3 bg-green-900/30 rounded-lg border border-green-700/50">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-300 font-semibold">Отличный прогресс</span>
            </div>
            <p className="text-sm text-[var(--color_text_secondary)]">Грудь и плечи хорошо развиты</p>
          </div>

          <div className="p-3 bg-yellow-900/30 rounded-lg border border-yellow-700/50">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-yellow-300 font-semibold">Следующая тренировка</span>
            </div>
            <p className="text-sm text-[var(--color_text_secondary)]">Спина + Ноги</p>
          </div>
        </div>
      </div>

      <div className="glass p-4 rounded-lg w-72">
        <h3 className="text-lg font-bold mb-3 text-white">Фильтры нагрузки</h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm bg-green-500/30 border border-green-500"></div>
              <span className="text-white">Низкая нагрузка</span>
            </div>
            <span className="text-[var(--color_text_muted)] text-sm">3 зоны</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm bg-yellow-500/30 border border-yellow-500"></div>
              <span className="text-white">Средняя нагрузка</span>
            </div>
            <span className="text-[var(--color_text_muted)] text-sm">5 зон</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm bg-red-500/30 border border-red-500"></div>
              <span className="text-white">Высокая нагрузка</span>
            </div>
            <span className="text-[var(--color_text_muted)] text-sm">2 зоны</span>
          </div>

          <div className="pt-3 border-t border-[var(--color_border)]">
            <div className="text-sm text-[var(--color_text_muted)] mb-2">Период:</div>
            <div className="flex gap-2">
              {['Неделя', 'Месяц', '3 месяца', 'Год'].map((period) => (
                <button
                  key={period}
                  className="px-3 py-1 text-sm rounded-full bg-[var(--color_bg_card)] hover:bg-[var(--color_bg_card_hover)] text-white transition"
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BodySVG;
