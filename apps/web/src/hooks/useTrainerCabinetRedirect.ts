import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

/**
 * Если раздел кабинета выключен в настройках — уводим с глубокого URL (закладка и т.п.).
 */
export function useTrainerCabinetRedirect(section: 'templates' | 'library') {
  const navigate = useNavigate();
  const flags = useFeatureFlags();

  useEffect(() => {
    if (section === 'templates' && !flags.trainerTemplates) {
      navigate('/trainer', { replace: true });
    }
    if (section === 'library' && !flags.trainerLibrary) {
      navigate('/trainer', { replace: true });
    }
  }, [section, flags.trainerTemplates, flags.trainerLibrary, navigate]);
}
