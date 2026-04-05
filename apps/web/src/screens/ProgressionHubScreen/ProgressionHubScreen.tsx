import { useNavigate, useSearchParams } from 'react-router';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import BackButton from '@/components/BackButton/BackButton';
import Tabs from '@/components/ui/Tabs';
import SectionDivider from '@/components/ui/SectionDivider';
import StrengthLogScreen from '@/screens/StrengthLogScreen/StrengthLogScreen';
import ExerciseDashboardScreen from '@/screens/ExerciseDashboardScreen/ExerciseDashboardScreen';

type ProgressionTab = 'log' | 'dashboard';

const TAB_ITEMS: { id: ProgressionTab; label: string }[] = [
  { id: 'log', label: 'Силовой журнал' },
  { id: 'dashboard', label: 'Дашборд' },
];

export default function ProgressionHubScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: ProgressionTab =
    searchParams.get('tab') === 'dashboard' ? 'dashboard' : 'log';

  const setTab = (id: ProgressionTab) => {
    if (id === 'dashboard') {
      setSearchParams({ tab: 'dashboard' }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  return (
    <Screen className="progression-hub-screen">
      <div className="p-4 w-full max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between mb-2">
          <BackButton onClick={() => navigate(-1)} />
        </div>

        <ScreenHeader
          icon="🏋️"
          title="Сила и прогресс"
          description="Силовой журнал — подходы с весом по упражнениям. Дашборд — выбранные движения и динамика условного 1RM за 30 дней."
        />

        <Tabs tabs={TAB_ITEMS} active={activeTab} onChange={setTab} />

        <SectionDivider />

        {activeTab === 'log' && <StrengthLogScreen embedded />}
        {activeTab === 'dashboard' && <ExerciseDashboardScreen embedded />}
      </div>
    </Screen>
  );
}
