import type { AthleteCrmStatus } from '@/api/trainer';
import StatusTag, { StatusTagRow } from '@/components/ui/StatusTag';

const ATHLETE_CRM_STATUS_CONFIG: Record<
  AthleteCrmStatus,
  { label: string; dot: string; pill: string }
> = {
  active: { label: 'Активен', dot: 'bg-green-400', pill: 'text-green-300 bg-green-500/10' },
  sleeping: { label: 'Неактивен', dot: 'bg-amber-400', pill: 'text-amber-300 bg-amber-500/10' },
  paused: { label: 'Пауза', dot: 'bg-blue-400', pill: 'text-blue-300 bg-blue-500/10' },
  churned: { label: 'Ушёл', dot: 'bg-gray-500', pill: 'text-gray-400 bg-gray-500/10' },
};

interface AthleteCrmStatusBadgeProps {
  status: AthleteCrmStatus;
  className?: string;
  hideWhenActive?: boolean;
}

export default function AthleteCrmStatusBadge({
  status,
  className = '',
  hideWhenActive = true,
}: AthleteCrmStatusBadgeProps) {
  if (hideWhenActive && status === 'active') return null;

  const cfg = ATHLETE_CRM_STATUS_CONFIG[status];

  return (
    <StatusTag
      label={cfg.label}
      pillClassName={cfg.pill}
      dotClassName={cfg.dot}
      className={className}
    />
  );
}

export function AthleteCrmStatusBadgeRow({
  status,
  className = '',
  center = false,
}: {
  status: AthleteCrmStatus;
  className?: string;
  center?: boolean;
}) {
  return (
    <StatusTagRow className={className} center={center}>
      <AthleteCrmStatusBadge status={status} />
    </StatusTagRow>
  );
}
