import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import MiniAvatar from '@/components/MiniAvatar/MiniAvatar';
import { trainerApi, type AthleteListItem } from '@/api/trainer';

interface AvatarEntry {
  athleteId: number;
  name: string;
  zoneIntensities: Record<string, number>;
}

interface AthleteAvatarsRowProps {
  athletes: AthleteListItem[];
  /** Если передан — клик переходит по этому prefix + athleteId. По умолчанию /trainer/athletes/:id */
  navigateTo?: (id: number) => string;
}

export default function AthleteAvatarsRow({ athletes, navigateTo }: AthleteAvatarsRowProps) {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<AvatarEntry[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!athletes.length) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // Инициализируем пустыми данными сразу, чтобы скелетон показался
    setEntries(
      athletes.map((a) => ({
        athleteId: a.id,
        name: a.fullName || a.email,
        zoneIntensities: {},
      }))
    );

    // Параллельно грузим зоны каждого атлета
    athletes.forEach(async (athlete) => {
      try {
        const res = await trainerApi.getAthleteAvatar(athlete.id, { mode: 'recovery' });
        const zones = res.data.data?.zones || {};
        const intensities: Record<string, number> = {};
        for (const [name, state] of Object.entries(zones)) {
          intensities[name] = (state as { intensity: number }).intensity;
        }
        setEntries((prev) =>
          prev.map((e) =>
            e.athleteId === athlete.id ? { ...e, zoneIntensities: intensities } : e
          )
        );
      } catch {
        // оставляем пустые зоны если ошибка
      }
    });

    return () => {
      abortRef.current?.abort();
    };
  }, [athletes]);

  if (!athletes.length) return null;

  const handleClick = (id: number) => {
    navigate(navigateTo ? navigateTo(id) : `/trainer/athletes/${id}`);
  };

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex gap-3 min-w-max px-1">
        {entries.map((entry) => (
          <MiniAvatar
            key={entry.athleteId}
            zoneIntensities={entry.zoneIntensities}
            name={entry.name}
            onClick={() => handleClick(entry.athleteId)}
          />
        ))}
      </div>
    </div>
  );
}
