import { useState } from 'react';

export type LoadType = 'low' | 'medium' | 'high';

export interface Day {
  date: string;
  load: LoadType;
  workout?: string;
}

interface ActivityGraphProps {
  selectedDay: Day | null;
  onSelect: (day: Day) => void;
}

const getColor = (load: LoadType) => {
  switch (load) {
    case 'high':
      return 'bg-emerald-600';
    case 'medium':
      return 'bg-emerald-400';
    case 'low':
      return 'bg-emerald-200';
    default:
      return 'bg-gray-200';
  }
};

export default function ActivityGraph({ selectedDay, onSelect }: ActivityGraphProps) {
  const loads: LoadType[] = ['low', 'medium', 'high'];
  const days: Day[] = [...Array(21)].map((_, i) => ({
    date: `2026-01-${i + 1}`,
    load: loads[Math.floor(Math.random() * 3)],
    workout: ['Силовая', 'Кардио', 'Отдых'][Math.floor(Math.random() * 3)],
  }));

  return (
    <div className="overflow-x-auto py-2">
      <div className="inline-grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const isActive = selectedDay?.date === day.date;
          return (
            <button
              key={i}
              onClick={() => onSelect(day)}
              className={`
                h-10 w-10 rounded
                ${getColor(day.load)}
                ${isActive ? 'ring-2 ring-yellow-400' : ''}
                transition
              `}
            />
          );
        })}
      </div>
    </div>
  );
}
