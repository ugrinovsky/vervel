// app/screens/ActivityScreen.tsx
import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import ActivityCalendar, { DayData } from '@/components/ActivityGraph/ActivityGraph';
import Screen from '@/components/Screen/Screen';
import {
  CalendarIcon,
  ChartBarIcon,
  ChartPieIcon,
  FireIcon,
  PlusIcon,
  DocumentDuplicateIcon,
  ArrowTrendingUpIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';

// Демо данные для упражнений
const demoExercises = [
  { name: 'Приседания со штангой', sets: '4x8', weight: '80кг', volume: '2560кг' },
  { name: 'Жим лежа', sets: '3x10', weight: '60кг', volume: '1800кг' },
  { name: 'Тяга верхнего блока', sets: '3x12', weight: '50кг', volume: '1800кг' },
  { name: 'Жим над головой', sets: '3x10', weight: '40кг', volume: '1200кг' },
];

export default function ActivityScreen() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Обработчик выбора дня
  const handleSelectDay = (day: DayData) => {
    setSelectedDate(day.date);
  };

  // Статистика за текущий месяц
  const monthlyStats = {
    workouts: 12,
    activeDays: 15,
    totalVolume: '45,280кг',
    streak: 5,
  };

  // Быстрые действия
  const quickActions = [
    { icon: HomeIcon, label: 'Сегодня', action: () => setSelectedDate(new Date()) },
    { icon: CalendarIcon, label: 'Весь месяц', action: () => console.log('Показать месяц') },
    { icon: ChartBarIcon, label: 'Аналитика', action: () => console.log('Перейти к аналитике') },
    { icon: ChartPieIcon, label: 'Прогресс', action: () => console.log('Показать прогресс') },
  ];

  return (
    <Screen>
      <div className="relative px-4 pt-6 pb-8">
        {/* Шапка экрана */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Активность</h1>
          <p className="text-gray-400">Отслеживайте ваши тренировки и прогресс</p>
        </div>

        {/* Быстрые действия */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className="glass p-4 rounded-xl hover:bg-gray-800/50 transition text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-gray-700 transition">
                  <action.icon className="w-5 h-5 text-blue-400" />
                </div>
                <span className="font-medium text-white group-hover:text-blue-300 transition">
                  {action.label}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Статистика месяца */}
        <div className="glass p-5 rounded-xl mb-6">
          <h2 className="text-lg font-bold text-white mb-4">Статистика месяца</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              value={monthlyStats.workouts}
              label="Тренировок"
              color="blue"
              icon={<CalendarIcon className="w-6 h-6" />}
            />
            <StatCard
              value={monthlyStats.activeDays}
              label="Активных дней"
              color="green"
              icon={<ChartBarIcon className="w-6 h-6" />}
            />
            <StatCard
              value={monthlyStats.totalVolume}
              label="Общий объем"
              color="yellow"
              icon={<ChartPieIcon className="w-6 h-6" />}
            />
            <StatCard
              value={`${monthlyStats.streak} дн.`}
              label="Серия подряд"
              color="red"
              icon={<FireIcon className="w-6 h-6" />}
            />
          </div>
        </div>

        {/* Календарь */}
        <div className="mb-8">
          <ActivityCalendar
            selectedDate={selectedDate}
            onSelect={handleSelectDay}
            month={new Date()}
          />
        </div>

        {/* Детали выбранного дня */}
        {selectedDate && (
          <div className="space-y-6 animate-fade-in">
            {/* Заголовок дня */}
            <div className="glass p-5 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
                  </h2>
                  <p className="text-gray-400">Выбранный день</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-600 text-sm rounded-full flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    Тренировка
                  </span>
                  <span className="px-3 py-1 bg-green-600 text-sm rounded-full flex items-center gap-1">
                    <FireIcon className="w-3 h-3" />
                    Силовая
                  </span>
                </div>
              </div>

              {/* Статистика дня */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatItem value="4" label="Упражнений" icon="🏋️‍♂️" />
                <StatItem value="75 мин" label="Длительность" icon="⏱️" />
                <StatItem value="7,360кг" label="Объем" icon="📊" />
                <StatItem value="420" label="Калорий" icon="🔥" />
              </div>
            </div>

            {/* Быстрые действия для дня */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button className="glass p-4 rounded-xl hover:bg-gray-800/50 transition text-center group">
                <div className="flex justify-center mb-2">
                  <DocumentDuplicateIcon className="w-6 h-6 text-gray-400 group-hover:text-blue-400 transition" />
                </div>
                <div className="font-medium text-white group-hover:text-blue-300 transition">
                  Дублировать тренировку
                </div>
                <div className="text-sm text-gray-400 mt-1 group-hover:text-gray-300 transition">
                  Создать копию
                </div>
              </button>

              <button className="glass p-4 rounded-xl hover:bg-gray-800/50 transition text-center group">
                <div className="flex justify-center mb-2">
                  <ArrowTrendingUpIcon className="w-6 h-6 text-gray-400 group-hover:text-green-400 transition" />
                </div>
                <div className="font-medium text-white group-hover:text-green-300 transition">
                  Сравнить с прошлой
                </div>
                <div className="text-sm text-gray-400 mt-1 group-hover:text-gray-300 transition">
                  Анализ прогресса
                </div>
              </button>

              <button className="glass p-4 rounded-xl hover:bg-gray-800/50 transition text-center bg-blue-600/20 border border-blue-500/30 group">
                <div className="flex justify-center mb-2">
                  <HomeIcon className="w-6 h-6 text-blue-400 group-hover:text-blue-300 transition" />
                </div>
                <div className="font-medium text-white">Установить цель</div>
                <div className="text-sm text-blue-300 mt-1">На следующий раз</div>
              </button>
            </div>
          </div>
        )}

        {/* Если день не выбран */}
        {!selectedDate && (
          <div className="text-center py-12 glass rounded-xl">
            <div className="flex justify-center mb-4">
              <CalendarIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Выберите день</h3>
            <p className="text-gray-400 mb-6">
              Кликните на любой день в календаре, чтобы увидеть детали
            </p>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition flex items-center gap-2 mx-auto"
            >
              <HomeIcon className="w-4 h-4" />
              Показать сегодня
            </button>
          </div>
        )}
      </div>
    </Screen>
  );
}

// Компонент статистики
function StatCard({
  value,
  label,
  color,
  icon,
}: {
  value: string | number;
  label: string;
  color: string;
  icon: React.ReactNode;
}) {
  const colorClasses = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
  };

  const iconColorClasses = {
    blue: 'text-blue-400/80',
    green: 'text-green-400/80',
    yellow: 'text-yellow-400/80',
    red: 'text-red-400/80',
  };

  return (
    <div className="text-center p-4 bg-gray-800/30 rounded-lg group hover:bg-gray-800/50 transition">
      <div
        className={`mb-1 flex justify-center ${iconColorClasses[color as keyof typeof iconColorClasses]}`}
      >
        {icon}
      </div>
      <div
        className={`text-2xl font-bold ${colorClasses[color as keyof typeof colorClasses]} group-hover:scale-105 transition-transform`}
      >
        {value}
      </div>
      <div className="text-xs text-gray-400 mt-1 group-hover:text-gray-300 transition">{label}</div>
    </div>
  );
}

// Компонент статистики дня
function StatItem({ value, label, icon }: { value: string; label: string; icon: string }) {
  return (
    <div className="text-center p-3 bg-gray-800/30 rounded-lg">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}
