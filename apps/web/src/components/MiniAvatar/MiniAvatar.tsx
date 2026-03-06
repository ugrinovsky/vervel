import {
  maleBody,
  femaleBody,
  type BodyGender,
  cropViewBox,
  getPaths,
  zoneColor,
  BODY_ZONE_TO_API,
} from '@/components/Avatar/bodyZones';

// sm: встраивается в строку списка (20×52px)
// md: в блоке сравнения группы (40×104px)
// lg: карточка атлета (64×164px)
type Size = 'sm' | 'md' | 'lg';

interface MiniAvatarProps {
  zoneIntensities: Record<string, number>; // API zone keys (e.g. 'back', 'legs', 'core')
  /** Отображается под силуэтом (только для md). Передайте пустую строку чтобы скрыть */
  name?: string;
  size?: Size;
  gender?: BodyGender;
  onClick?: () => void;
}

// Supports both appZone keys ('backMuscles') and API keys ('back') in zoneIntensities
function getIntensity(appZone: string, zoneIntensities: Record<string, number>): number {
  if (zoneIntensities[appZone] !== undefined) return zoneIntensities[appZone];
  const apiZone = BODY_ZONE_TO_API[appZone];
  return apiZone ? (zoneIntensities[apiZone] ?? 0) : 0;
}

const SIZE_CLASSES: Record<Size, { wrapper: string; label: string }> = {
  sm: { wrapper: 'w-5 h-[52px]',   label: 'hidden' },
  md: { wrapper: 'w-10 h-[104px]', label: 'text-[10px] text-(--color_text_secondary) truncate max-w-[44px] text-center leading-tight' },
  lg: { wrapper: 'w-24 h-[246px]', label: 'hidden' },
};

export default function MiniAvatar({
  zoneIntensities,
  name = '',
  size = 'md',
  gender = 'male',
  onClick,
}: MiniAvatarProps) {
  const { wrapper, label } = SIZE_CLASSES[size];
  const firstName = name.split(' ')[0];

  const bodyData = gender === 'female' ? femaleBody : maleBody;
  const { viewBox: rawViewBox, outline, parts } = bodyData.front;
  const viewBox = cropViewBox(rawViewBox, 0.08);

  const structuralParts = parts.filter((p) => p.appZone === null);
  const exerciseParts   = parts.filter((p) => p.appZone !== null);

  return (
    <div
      className={`flex flex-col items-center gap-0.5 shrink-0 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      onClick={onClick}
    >
      <div className={`${wrapper} relative`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={viewBox}
          className="w-full h-full"
        >
          {/* Body outline */}
          <path
            d={outline}
            fill="none"
            stroke="rgba(176,200,210,0.45)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Structural parts (head, neck, hands, feet) */}
          {structuralParts.map((p) =>
            getPaths(p).map((d, i) => (
              <path
                key={`s-${p.slug}-${i}`}
                d={d}
                fill="rgba(176,200,210,0.06)"
                stroke="rgba(176,200,210,0.12)"
                strokeWidth={0.5}
              />
            ))
          )}

          {/* Zone outlines */}
          {exerciseParts.map((p) =>
            getPaths(p).map((d, i) => (
              <path
                key={`zo-${p.slug}-${i}`}
                d={d}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={0.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))
          )}

          {/* Zone fills */}
          {exerciseParts.map((p) => {
            const intensity = getIntensity(p.appZone!, zoneIntensities);
            if (intensity <= 0) return null;
            const fill = zoneColor(intensity, 0.35 + intensity * 0.5);
            return getPaths(p).map((d, i) => (
              <path
                key={`zf-${p.slug}-${i}`}
                d={d}
                fill={fill}
                stroke="none"
              />
            ));
          })}
        </svg>
      </div>

      {label !== 'hidden' && firstName && (
        <span className={label}>{firstName}</span>
      )}
    </div>
  );
}
