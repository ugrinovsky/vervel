import { useNavigate } from 'react-router';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import BackButton from '@/components/BackButton/BackButton';
import SectionDivider from '@/components/ui/SectionDivider';
import StrengthLogScreen from '@/screens/StrengthLogScreen/StrengthLogScreen';

export default function ProgressionHubScreen() {
  const navigate = useNavigate();

  return (
    <Screen className="progression-hub-screen">
      <div className="p-4 w-full max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between mb-2">
          <BackButton onClick={() => navigate(-1)} />
        </div>

        <ScreenHeader
          icon="🏋️"
          title="Сила и прогресс"
          description="Журнал с весом: таблица подходов, график и сводка 30 дней. Эталоны объединяют разные id одного движения."
        />

        <SectionDivider />

        <StrengthLogScreen embedded />
      </div>
    </Screen>
  );
}
