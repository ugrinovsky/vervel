import ActivityGraph, { Day } from '@/components/ActivityGraph';
import DayDetails from '@/components/DayDetails';
import ExercisesList from '@/components/ExercisesList';
import Screen from '@/components/Screen';
import { useState } from 'react';

type DayData = {
  date: string;
  load: 'low' | 'medium' | 'high';
  workout?: string;
};

export default function ActivityScreen() {
  const start = new Date();
  const days: Day[] = Array.from({ length: 56 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() - i);
    const loads: Day['load'][] = ['light', 'medium', 'high', 'miss'];
    return {
      date: d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' }),
      load: loads[Math.floor(Math.random() * 4)],
      workout: Math.random() > 0.5 ? 'Силовая' : undefined,
    };
  });

  const [selectedDay, setSelectedDay] = useState<Day | null>(null);

  return (
    <Screen>
      <div className="relative px-4 pt-6 pb-8">
        <h1 className="mb-6 text-xl font-semibold">Активность</h1>

        <div
          className={`
          transition-all duration-300 ease-in-out
          ${selectedDay ? 'translate-y-0' : 'translate-y-24'}
        `}
        >
          <ActivityGraph days={days} selectedDay={selectedDay} onSelect={setSelectedDay} />
        </div>

        {selectedDay && (
          <div className="mt-8 space-y-4 animate-fade-in">
            <DayDetails data={selectedDay} />
          </div>
        )}
      </div>
      <ExercisesList />
    </Screen>
  );
}
