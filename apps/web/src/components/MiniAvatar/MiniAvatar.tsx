import muscleZones from '@/components/Avatar/manZones';

// sm: встраивается в строку списка (20×52px)
// md: в блоке сравнения группы (40×104px)
type Size = 'sm' | 'md';

interface MiniAvatarProps {
  zoneIntensities: Record<string, number>;
  /** Отображается под силуэтом (только для md). Передайте пустую строку чтобы скрыть */
  name?: string;
  size?: Size;
  onClick?: () => void;
}

const bodyZone = muscleZones.find((z) => z.name === 'body');
const muscleZonesWithoutBody = muscleZones.filter((z) => z.name !== 'body');

function getFillColor(zoneName: string, zoneIntensities: Record<string, number>): string {
  const intensity = zoneIntensities[zoneName] || 0;
  if (intensity > 0) {
    const hue = 120 - intensity * 120;
    const alpha = 0.35 + intensity * 0.5;
    return `hsla(${hue}, 70%, 50%, ${alpha})`;
  }
  return 'transparent';
}

const SIZE_CLASSES: Record<Size, { wrapper: string; label: string }> = {
  sm: { wrapper: 'w-5 h-[52px]',  label: 'hidden' },
  md: { wrapper: 'w-10 h-[104px]', label: 'text-[10px] text-(--color_text_secondary) truncate max-w-[44px] text-center leading-tight' },
};

export default function MiniAvatar({
  zoneIntensities,
  name = '',
  size = 'md',
  onClick,
}: MiniAvatarProps) {
  const { wrapper, label } = SIZE_CLASSES[size];
  const firstName = name.split(' ')[0];

  return (
    <div
      className={`flex flex-col items-center gap-0.5 shrink-0 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      onClick={onClick}
    >
      <div className={`${wrapper} relative`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="218.465 354.786 281.446 720.395"
          className="w-full h-full"
        >
          {/* Контур тела */}
          {bodyZone?.paths.map((path, i) => (
            <path
              key={i}
              d={path}
              fill="none"
              stroke="rgb(176 255 245 / 40%)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Контуры зон */}
          {muscleZonesWithoutBody.map((zone) =>
            zone.paths.map((path, i) => (
              <path
                key={`outline-${zone.name}-${i}`}
                d={path}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={0.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))
          )}

          {/* Заливка зон */}
          {muscleZonesWithoutBody.map((zone) =>
            zone.paths.map((path, i) => {
              const fill = getFillColor(zone.name, zoneIntensities);
              if (fill === 'transparent') return null;
              return (
                <path
                  key={`fill-${zone.name}-${i}`}
                  d={path}
                  fill={fill}
                  stroke="none"
                />
              );
            })
          )}
        </svg>
      </div>

      {label !== 'hidden' && firstName && (
        <span className={label}>{firstName}</span>
      )}
    </div>
  );
}
