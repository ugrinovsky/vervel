import { useMemo } from 'react';
import { format } from 'date-fns';
import { parseAthleteWorkoutDraft } from '@/util/localStorageWorkoutDraft';

/** Черновик тренировки атлета из localStorage (синхронизация с Activity + Avatar). */
export function useAthleteWorkoutDraftLocal(userId?: number) {
  const draft = useMemo(() => {
    if (!userId) return null;
    const raw = localStorage.getItem(`workout_draft_${userId}`);
    if (!raw) return null;
    return parseAthleteWorkoutDraft(raw);
  }, [userId]);

  const draftDateKey = draft?.date ? format(new Date(draft.date), 'yyyy-MM-dd') : null;

  return { draft, draftDateKey };
}
