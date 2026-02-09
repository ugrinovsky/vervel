// components/analytics/WeeklyOverview.tsx
export default function WeeklyOverview() {
  const weekData = [
    { day: 'Пн', load: 85, type: 'Силовая' },
    { day: 'Вт', load: 0, type: 'Отдых' },
    { day: 'Ср', load: 92, type: 'Силовая' },
    { day: 'Чт', load: 45, type: 'Кардио' },
    { day: 'Пт', load: 78, type: 'Силовая' },
    { day: 'Сб', load: 60, type: 'Кроссфит' },
    { day: 'Вс', load: 0, type: 'Отдых' },
  ];

  return (
    <div className="glass p-5 rounded-xl">
      <h3 className="text-lg font-bold text-white mb-4">📅 Неделя</h3>
      <div className="space-y-3">
        {weekData.map((day) => (
          <div key={day.day} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 text-gray-300">{day.day}</div>
              {day.load > 0 ? (
                <>
                  <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-yellow-500 rounded-full"
                      style={{ width: `${day.load}%` }}
                    />
                  </div>
                  <div className="text-sm text-gray-400">{day.type}</div>
                </>
              ) : (
                <div className="text-sm text-gray-500">Отдых</div>
              )}
            </div>
            <div className="font-bold text-white">{day.load > 0 ? `${day.load}%` : '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
