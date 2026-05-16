import BottomSheet from '@/components/BottomSheet/BottomSheet';
import PassBlock from '@/screens/TrainerAthleteDetailScreen/PassBlock';
import UserAvatar from '@/components/UserAvatar/UserAvatar';
import { type AthletePassSummary } from '@/api/trainer';

interface Props {
  summary: AthletePassSummary | null;
  open: boolean;
  onClose: () => void;
}

export default function AthletePassSheet({ summary, open, onClose }: Props) {
  const name = summary?.athleteName || summary?.athleteEmail || '—';

  return (
    <BottomSheet id="athlete-pass-sheet" open={open} onClose={onClose} title={name} emoji="💳">
      {summary?.athleteId ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <UserAvatar
              photoUrl={summary.athletePhotoUrl}
              name={name}
              size={36}
              className="shrink-0"
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{name}</div>
              {summary.athleteEmail && summary.athleteName && (
                <div className="text-xs text-(--color_text_muted) truncate">
                  {summary.athleteEmail}
                </div>
              )}
            </div>
          </div>
          <PassBlock athleteId={summary.athleteId} />
        </div>
      ) : null}
    </BottomSheet>
  );
}
