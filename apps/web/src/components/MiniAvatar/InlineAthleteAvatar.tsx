import { useEffect, useState } from 'react';
import MiniAvatar from './MiniAvatar';
import { trainerApi } from '@/api/trainer';

interface Props {
  athleteId: number;
}

export default function InlineAthleteAvatar({ athleteId }: Props) {
  const [zones, setZones] = useState<Record<string, number>>({});

  useEffect(() => {
    trainerApi
      .getAthleteAvatar(athleteId, { mode: 'recovery' })
      .then((res) => {
        const raw = res.data.data?.zones || {};
        const intensities: Record<string, number> = {};
        for (const [name, state] of Object.entries(raw)) {
          intensities[name] = (state as { intensity: number }).intensity;
        }
        setZones(intensities);
      })
      .catch(() => {});
  }, [athleteId]);

  return <MiniAvatar zoneIntensities={zones} size="sm" />;
}
