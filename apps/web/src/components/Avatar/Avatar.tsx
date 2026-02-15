import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import muscleZones from './manZones';

interface BodySVGProps {
  zoneIntensities?: Record<string, number>;
  selectedZone?: string | null;
  onZoneClick?: (zoneName: string) => void;
}

const BodySVG: React.FC<BodySVGProps> = ({
  zoneIntensities = {},
  selectedZone = null,
  onZoneClick,
}) => {
  const [isAnimating, setIsAnimating] = useState(true);
  const [showFill, setShowFill] = useState(false);

  const DEFAULT_ZONE_STROKE = 'rgba(255, 255, 255, 0.15)';

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
    const intensity = zoneIntensities[zoneName] || 0;

    if (zoneName === selectedZone) {
      const hue = intensity > 0 ? 120 - intensity * 120 : 180;
      return `hsla(${hue}, 80%, 55%, 0.6)`;
    }

    if (intensity > 0) {
      const hue = 120 - intensity * 120;
      const alpha = 0.3 + intensity * 0.5;
      return `hsla(${hue}, 70%, 50%, ${alpha})`;
    }

    return 'transparent';
  };

  const getStrokeColor = (zoneName: string) => {
    if (zoneName === selectedZone) {
      return 'rgba(255, 255, 255, 0.6)';
    }

    const intensity = zoneIntensities[zoneName] || 0;
    if (intensity > 0) {
      return `rgba(255, 255, 255, ${0.1 + intensity * 0.2})`;
    }

    return DEFAULT_ZONE_STROKE;
  };

  const bodyZone = muscleZones.find((z) => z.name === 'body');
  const muscleZonesWithoutBody = muscleZones.filter((z) => z.name !== 'body');

  return (
    <div className="avatar-wrapper glass relative">
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
                onClick={() => onZoneClick?.(zone.name)}
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
          muscleZonesWithoutBody.map((zone) => (
            <g key={`permanent-outline-${zone.name}`}>
              {zone.paths.map((path, index) => (
                <path
                  key={`permanent-outline-${zone.name}-${index}`}
                  d={path}
                  fill="none"
                  stroke={getStrokeColor(zone.name)}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ pointerEvents: 'none' }}
                />
              ))}
            </g>
          ))}

        {/* Заливка зон */}
        {showFill &&
          muscleZonesWithoutBody.map((zone) => (
            <g key={`fill-${zone.name}`}>
              {zone.paths.map((path, index) => (
                <motion.path
                  key={`fill-${zone.name}-${index}`}
                  d={path}
                  fill={getFillColor(zone.name)}
                  stroke="none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.1,
                    ease: 'easeInOut',
                  }}
                  className="transition-all duration-300"
                  style={{ pointerEvents: 'none' }}
                />
              ))}
            </g>
          ))}
      </svg>
    </div>
  );
};

export default BodySVG;
