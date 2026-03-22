export default function DayDetails({ data }: { data: any }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4 backdrop-blur">
      <div className="mb-2 text-lg font-medium">{data.date}</div>

      <div className="text-sm text-[var(--color_text_secondary)]">{loadLabel(data.load)}</div>

      {data.workout ? (
        <div className="mt-2 text-sm">{data.workout} тренировка</div>
      ) : (
        <div className="mt-2 text-sm text-[var(--color_text_muted)]">День отдыха</div>
      )}
    </div>
  );
}

function loadLabel(load: 'low' | 'medium' | 'high') {
  switch (load) {
    case 'low':
      return 'Лёгкая нагрузка';
    case 'medium':
      return 'Средняя нагрузка';
    case 'high':
      return 'Высокая нагрузка';
  }
}
