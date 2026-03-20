import { useEffect, useState } from 'react';
import MiniAvatar from './MiniAvatar';
import { trainerApi } from '@/api/trainer';
import { ZONE_NORMALIZE } from '@/components/AvatarView/AvatarView';

interface Props {
  athleteId: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function InlineAthleteAvatar({ athleteId, size = 'lg' }: Props) {
  const [zones, setZones] = useState<Record<string, number>>({});

  useEffect(() => {
    trainerApi
      .getAthleteAvatar(athleteId, { mode: 'recovery' })
      .then((res) => {
        const raw = res.data.data?.zones || {};
        const intensities: Record<string, number> = {};
        for (const [name, state] of Object.entries(raw)) {
          const canonical = ZONE_NORMALIZE[name] ?? name;
          const intensity = (state as { intensity: number }).intensity;
          if (intensities[canonical] === undefined || intensity > intensities[canonical]) {
            intensities[canonical] = intensity;
          }
        }
        setZones(intensities);
      })
      .catch(() => {});
  }, [athleteId]);

  return <MiniAvatar zoneIntensities={zones} size={size} />;
}
