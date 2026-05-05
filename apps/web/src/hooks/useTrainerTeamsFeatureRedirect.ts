import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

/**
 * Вкладка «Команда», списки атлетов и групп — доступны только при включённом featTeams («Атлеты и группы»).
 */
export function useTrainerTeamsFeatureRedirect() {
  const navigate = useNavigate();
  const { teams } = useFeatureFlags();

  useEffect(() => {
    if (!teams) navigate('/trainer', { replace: true });
  }, [teams, navigate]);
}
