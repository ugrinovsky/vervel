import { useState } from 'react';
import { useNavigate } from 'react-router';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import BackButton from '@/components/BackButton/BackButton';
import Tabs from '@/components/ui/Tabs';
import StrengthLogScreen from '@/screens/StrengthLogScreen/StrengthLogScreen';
import SectionGroup from '@/components/ui/SectionGroup';

type HubTab = 'journal' | 'advanced';

export default function ProgressionHubScreen() {
  const navigate = useNavigate();
  const [hubTab, setHubTab] = useState<HubTab>('journal');

  return (
    <Screen className="progression-hub-screen">
      <div className="p-4 w-full">
        <SectionGroup showLabel={false} showBreakAfter={false} bodyClassName="space-y-4">
          <div className="flex items-center justify-between">
            <BackButton onClick={() => navigate(-1)} />
          </div>

          <ScreenHeader
            icon="🏋️"
            title="Сила и прогресс"
            description={
              hubTab === 'journal'
                ? 'Журнал с весом: подходы, график и сводка. Закрепления и тип тренировки — ниже.'
                : 'Список эталонов — общие имена для разных названий одного упражнения. Строка открывает настройки; ИИ — если остались несвязанные названия.'
            }
          />

          <Tabs
            tabs={[
              { id: 'journal', label: 'Журнал' },
              { id: 'advanced', label: 'Эталоны' },
            ]}
            active={hubTab}
            onChange={(id) => setHubTab(id)}
          />
        </SectionGroup>

        <SectionGroup title={hubTab === 'journal' ? 'Журнал' : 'Эталоны'} showBreakAfter={false}>
          <StrengthLogScreen embedded progressionHubTab={hubTab} />
        </SectionGroup>
      </div>
    </Screen>
  );
}
