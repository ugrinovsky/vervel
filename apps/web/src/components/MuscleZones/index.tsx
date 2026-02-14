import { MuscleZone } from '@/constants/zones';
import { Button } from '@headlessui/react';

interface MuscleZonesProps {
  zones: MuscleZone[];
  onListClick: (zone: MuscleZone) => void;
}

export default function MuscleZones({ zones, onListClick }: MuscleZonesProps) {
  return (
    <div className="muscle-list glass md:h-auto">
      {zones.map((zone) => (
        <Button
          key={zone.id}
          onClick={() => onListClick(zone)}
          className="px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white-800 hover:bg-[var(--color_text_secondary)] mr-2 mb-2"
        >
          {zone.label}
        </Button>
      ))}
    </div>
  );
}
