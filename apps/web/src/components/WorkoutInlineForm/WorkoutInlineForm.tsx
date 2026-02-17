import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { trainerApi, type AssignedTo, type WorkoutData } from '@/api/trainer';

interface WorkoutInlineFormProps {
  preselectedAssignee?: AssignedTo;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function WorkoutInlineForm({
  preselectedAssignee,
  onSuccess,
  onCancel,
}: WorkoutInlineFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00');
  const [workoutType, setWorkoutType] = useState<'crossfit' | 'bodybuilding' | 'cardio'>('crossfit');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!date || !time) {
      toast.error('Укажите дату и время');
      return;
    }

    setLoading(true);
    try {
      const scheduledDate = `${date}T${time}:00`;
      const workoutData: WorkoutData = {
        type: workoutType,
        exercises: [],
        notes: notes || undefined,
      };

      const assignedTo = preselectedAssignee ? [preselectedAssignee] : [];

      await trainerApi.createScheduledWorkout({
        scheduledDate,
        workoutData,
        assignedTo,
        notes: notes || undefined,
      });

      toast.success('Тренировка создана');
      onSuccess?.();
    } catch {
      toast.error('Ошибка создания тренировки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-[var(--color_bg_card)] rounded-2xl p-5 border border-[var(--color_border)]"
    >
      <h3 className="text-lg font-semibold text-white mb-4">Создать тренировку</h3>

      <div className="space-y-4">
        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--color_text_muted)] mb-1 block">Дата</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[var(--color_bg_input)] border border-[var(--color_border)] rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[var(--color_primary_light)] transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color_text_muted)] mb-1 block">Время</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-[var(--color_bg_input)] border border-[var(--color_border)] rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[var(--color_primary_light)] transition-colors"
            />
          </div>
        </div>

        {/* Workout Type */}
        <div>
          <label className="text-xs text-[var(--color_text_muted)] mb-2 block">Тип тренировки</label>
          <div className="grid grid-cols-3 gap-2">
            {(['crossfit', 'bodybuilding', 'cardio'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setWorkoutType(type)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  workoutType === type
                    ? 'bg-[var(--color_primary_light)] text-white'
                    : 'bg-[var(--color_bg_card_hover)] text-[var(--color_text_muted)] hover:text-white'
                }`}
              >
                {type === 'crossfit' ? 'CrossFit' : type === 'bodybuilding' ? 'Силовая' : 'Кардио'}
              </button>
            ))}
          </div>
        </div>

        {/* Assigned To */}
        {preselectedAssignee && (
          <div>
            <label className="text-xs text-[var(--color_text_muted)] mb-1 block">Для кого</label>
            <div className="px-3 py-2 rounded-lg bg-[var(--color_bg_input)] text-sm text-white">
              {preselectedAssignee.type === 'group' ? '👥' : '🏃'} {preselectedAssignee.name}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-xs text-[var(--color_text_muted)] mb-1 block">Заметки (опционально)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Дополнительная информация..."
            rows={3}
            className="w-full bg-[var(--color_bg_input)] border border-[var(--color_border)] rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[var(--color_primary_light)] transition-colors resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2 rounded-xl bg-[var(--color_primary_light)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Создание...' : 'Создать'}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-[var(--color_bg_card_hover)] text-[var(--color_text_muted)] hover:text-white transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
