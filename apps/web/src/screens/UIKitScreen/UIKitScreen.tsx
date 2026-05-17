import { useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import type { WorkoutTemplate } from '@/api/trainer';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import Button, { MotionButton } from '@/components/ui/Button';
import { type ButtonSize, type ButtonVariant } from '@/components/ui/buttonStyles';
import PillButton from '@/components/ui/PillButton';
import IconButton from '@/components/ui/IconButton';
import GhostButton from '@/components/ui/GhostButton';
import AccentButton from '@/components/ui/AccentButton';
import ListButton from '@/components/ui/ListButton';
import CloseButton from '@/components/ui/CloseButton';
import ToolbarButton from '@/components/ui/ToolbarButton';
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton';
import ButtonLink from '@/components/ui/ButtonLink';
import Badge from '@/components/ui/Badge';
import Switch from '@/components/ui/Switch';
import Tabs from '@/components/ui/Tabs';
import TabCard from '@/components/ui/TabCard';
import ToggleGroup from '@/components/ui/ToggleGroup';
import GenderToggle from '@/components/ui/GenderToggle';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import NumberInput from '@/components/ui/NumberInput';
import SearchInput from '@/components/ui/SearchInput';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import { cardClass } from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import { SectionCard, SectionCardRow } from '@/components/ui/SectionCard';
import SectionGroup from '@/components/ui/SectionGroup';
import SectionDivider from '@/components/ui/SectionDivider';
import SectionBreak from '@/components/ui/SectionBreak';
import LoadingSpinner, {
  type LoadingSpinnerSize,
  type LoadingSpinnerVariant,
} from '@/components/ui/LoadingSpinner';
import Calendar from '@/components/ui/Calendar';
import ChipScrollRow from '@/components/ui/ChipScrollRow';
import ChoiceChips, { type ChoiceChipOption } from '@/components/ui/ChoiceChips';
import FieldLabel from '@/components/ui/FieldLabel';
import PhoneInput from '@/components/ui/PhoneInput';
import DatePickerField from '@/components/ui/DatePickerField';
import TimeInput from '@/components/ui/TimeInput';
import UiCombobox from '@/components/ui/Combobox';
import UiListbox from '@/components/ui/Listbox';
import AnimatedBlock from '@/components/ui/AnimatedBlock';
import CollapsibleBlock from '@/components/ui/CollapsibleBlock';
import ConfirmDeleteWrapper from '@/components/ui/ConfirmDeleteWrapper';
import FloatingPanel from '@/components/ui/FloatingPanel';
import LineChart from '@/components/ui/LineChart';
import RouteLoading from '@/components/ui/RouteLoading';
import TemplatePicker from '@/components/ui/TemplatePicker';
import AiSheetHeader from '@/components/ui/AiSheetHeader';
import AiLoadingView from '@/components/ui/AiLoadingView';
import AiCostNotice from '@/components/ui/AiCostNotice';
import UiModeCard from '@/components/ui/UiModeCard';
import { UI_MODE_ORDER } from '@/util/uiModeCopy';

const BUTTON_VARIANTS: ButtonVariant[] = [
  'primary',
  'secondary',
  'soft',
  'ghost',
  'outline',
  'outline-accent',
  'link',
  'danger',
  'danger-soft',
  'success',
  'soft-muted',
  'subtle',
  'emerald',
  'emerald-cta',
  'list-row',
];

const BUTTON_SIZES: ButtonSize[] = ['xs', 'sm', 'md', 'lg'];

const SPINNER_SIZES: LoadingSpinnerSize[] = ['2xs', 'xs', 'sm', 'md', 'lg'];
const SPINNER_VARIANTS: LoadingSpinnerVariant[] = [
  'accent',
  'light',
  'soft',
  'emeraldArc',
  'emeraldAccent',
  'trackDark',
  'trackLight',
  'primaryArc',
];

const SELECT_OPTIONS = [
  { value: 'a', label: 'Вариант A' },
  { value: 'b', label: 'Вариант B' },
  { value: 'c', label: 'Вариант C' },
];

const COMBO_OPTIONS = [
  { value: 'squat', label: 'Присед' },
  { value: 'bench', label: 'Жим лёжа' },
  { value: 'dead', label: 'Становая' },
];

const LISTBOX_OPTIONS = [
  { value: 1, label: 'Понедельник' },
  { value: 2, label: 'Среда' },
  { value: 3, label: 'Пятница' },
];

const MOCK_TEMPLATES: WorkoutTemplate[] = [
  { id: 1, name: 'Силовая база', workoutType: 'bodybuilding', exercises: [], isPublic: false },
  { id: 2, name: 'WOD', workoutType: 'crossfit', exercises: [], isPublic: true },
];

const CHART_DATES = ['2026-05-01', '2026-05-08', '2026-05-15', '2026-05-22'];
const CHART_SERIES = [
  {
    id: 1,
    label: 'Объём',
    points: [
      { workouts: 2, volume: 1200 },
      { workouts: 3, volume: 1500 },
      { workouts: 1, volume: 900 },
      { workouts: 4, volume: 1800 },
    ],
  },
];

const AI_LOADING_STEPS = ['Анализируем…', 'Составляем план…', 'Почти готово…'];

const COMPONENT_CATALOG = [
  'AccentButton',
  'AiCostNotice',
  'AiLoadingView',
  'AiSheetHeader',
  'AnimatedBlock',
  'Input',
  'Badge',
  'Button',
  'ButtonLink',
  'Calendar',
  'Card',
  'CardHeader',
  'ChipScrollRow',
  'ChoiceChips',
  'CloseButton',
  'CollapsibleBlock',
  'Combobox',
  'ConfirmDeleteButton',
  'ConfirmDeleteWrapper',
  'FieldLabel',
  'FloatingPanel',
  'GenderToggle',
  'GhostButton',
  'IconButton',
  'LineChart',
  'Listbox',
  'ListButton',
  'LoadingSpinner',
  'NumberInput',
  'PhoneInput',
  'PillButton',
  'RouteLoading',
  'SearchInput',
  'SectionBreak',
  'SectionCard',
  'SectionDivider',
  'SectionGroup',
  'Select',
  'Switch',
  'TabCard',
  'Tabs',
  'TemplatePicker',
  'TimeInput',
  'ToggleGroup',
  'ToolbarButton',
  'UiModeCard',
] as const;

const TOC = [
  { id: 'buttons', label: 'Button' },
  { id: 'buttons-legacy', label: 'Legacy' },
  { id: 'badges', label: 'Badge' },
  { id: 'toggles', label: 'Toggles' },
  { id: 'inputs', label: 'Inputs' },
  { id: 'pickers', label: 'Pickers' },
  { id: 'layout', label: 'Layout' },
  { id: 'blocks', label: 'Blocks' },
  { id: 'ai', label: 'AI' },
  { id: 'data', label: 'Charts' },
  { id: 'spinners', label: 'Spinners' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'chips', label: 'ChoiceChips' },
  { id: 'catalog', label: 'Каталог' },
] as const;

function UiKitSection({
  id,
  title,
  path,
  children,
}: {
  id: string;
  title: string;
  path: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <code className="text-[11px] text-(--color_text_muted) font-mono">{path}</code>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div>
      {label && <p className="text-[11px] text-(--color_text_muted) mb-1.5">{label}</p>}
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function DemoBox({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`glass rounded-xl p-4 ${className}`.trim()}>{children}</div>
  );
}

export default function UIKitScreen() {
  const [switchOn, setSwitchOn] = useState(true);
  const [tab, setTab] = useState<'one' | 'two' | 'three'>('one');
  const [tabCard, setTabCard] = useState<'a' | 'b'>('a');
  const [toggleVal, setToggleVal] = useState<string | number>('opt1');
  const [joinedToggle, setJoinedToggle] = useState('j1');
  const [gender, setGender] = useState<'male' | 'female' | null>('male');
  const [selectVal, setSelectVal] = useState('');
  const [search, setSearch] = useState('');
  const [pillActive, setPillActive] = useState(true);
  const [chipKey, setChipKey] = useState('all');
  const [chipColoredKey, setChipColoredKey] = useState('new');
  const [choicePill, setChoicePill] = useState<'new' | 'contacted' | 'trial'>('new');
  const [choiceTile, setChoiceTile] = useState<'active' | 'sleeping'>('active');

  const choicePillOptions: ChoiceChipOption<'new' | 'contacted' | 'trial'>[] = [
    {
      value: 'new',
      label: 'Новый',
      activeClass: 'border-amber-400 bg-amber-500/25 text-amber-100',
      inactiveClass: 'border-amber-500/20 bg-amber-500/10 text-amber-400/70 hover:text-amber-100',
    },
    {
      value: 'contacted',
      label: 'Связался',
      activeClass: 'border-blue-400 bg-blue-500/25 text-blue-100',
      inactiveClass: 'border-blue-500/20 bg-blue-500/10 text-blue-400/70 hover:text-blue-100',
    },
    {
      value: 'trial',
      label: 'Пробное',
      activeClass: 'border-purple-400 bg-purple-500/25 text-purple-100',
      inactiveClass: 'border-purple-500/20 bg-purple-500/10 text-purple-400/70 hover:text-purple-100',
    },
  ];

  const choiceTileOptions: ChoiceChipOption<'active' | 'sleeping'>[] = [
    {
      value: 'active',
      label: 'Активен',
      description: 'Клиент ходит и занимается',
      activeClass: 'border-green-400 bg-green-500/25 text-green-100',
      inactiveClass: 'border-green-500/20 bg-green-500/10 text-green-400/70 hover:text-green-100',
    },
    {
      value: 'sleeping',
      label: 'Неактивен',
      description: 'Давно нет активности',
      activeClass: 'border-amber-400 bg-amber-500/25 text-amber-100',
      inactiveClass: 'border-amber-500/20 bg-amber-500/10 text-amber-400/70 hover:text-amber-100',
    },
  ];
  const [calendarDate, setCalendarDate] = useState<Date | null>(new Date());
  const [phone, setPhone] = useState('');
  const [time, setTime] = useState('09:30');
  const [pickerDate, setPickerDate] = useState<Date | null>(new Date());
  const [comboVal, setComboVal] = useState<(typeof COMBO_OPTIONS)[number] | null>(COMBO_OPTIONS[0]);
  const [listVal, setListVal] = useState<(typeof LISTBOX_OPTIONS)[number] | null>(LISTBOX_OPTIONS[0]);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [showAnimated, setShowAnimated] = useState(true);

  const chipItems = useMemo(
    () => [
      { key: 'all', label: 'Все' },
      { key: 'strength', label: 'Силовые' },
      { key: 'cardio', label: 'Кардио' },
      { key: 'crossfit', label: 'Кроссфит' },
      { key: 'rest', label: 'Отдых' },
      { key: 'drafts', label: 'Черновики' },
    ],
    [],
  );

  const chipColoredItems = useMemo(
    () => [
      {
        key: 'all',
        label: 'Все',
        inactiveClass: 'border-(--color_border) bg-(--color_bg_card) text-(--color_text_muted)',
        activeClass: 'border-(--color_primary_light) bg-(--color_primary_light)/25 text-white',
      },
      { key: 'new', label: 'Новые', tone: 'new' as const },
      { key: 'contacted', label: 'Связались', tone: 'contacted' as const },
    ],
    [],
  );

  const calendarDays = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 5 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - 2 + i);
      return {
        date,
        load: (['none', 'low', 'medium', 'high'] as const)[i % 4],
        hasWorkouts: i > 0,
      };
    });
  }, []);

  const trainerCalendarDays = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 5 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - 2 + i);
      return { date, count: i % 4, isRestDay: i === 4 };
    });
  }, []);

  return (
    <Screen bottomInset="safe" className="px-4 pt-4 pb-8 max-w-2xl mx-auto">
      <ScreenHeader
        icon="🎨"
        title="UI Kit"
        description="Витрина контролов из components/ui. Доступна только в dev: /uikit"
      />

      <nav className="glass rounded-xl p-3 mb-6 flex flex-wrap gap-2">
        {TOC.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="text-xs px-2 py-1 rounded-md bg-(--color_bg_card_hover) text-(--color_text_muted) hover:text-white transition-colors"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="space-y-10">
        <UiKitSection id="buttons" title="Button" path="@/components/ui/Button">
          <Row label="variant × md">
            {BUTTON_VARIANTS.map((variant) => (
              <Button key={variant} variant={variant} size="md" fullWidth={false}>
                {variant}
              </Button>
            ))}
          </Row>

          <Row label="size × primary">
            {BUTTON_SIZES.map((size) => (
              <Button key={size} variant="primary" size={size} fullWidth={false}>
                {size}
              </Button>
            ))}
          </Row>

          <Row label="states">
            <Button variant="primary" loading loadingText="Загрузка…">
              loading
            </Button>
            <Button variant="primary" disabled>
              disabled
            </Button>
            <Button variant="list-row" selected>
              list-row selected
            </Button>
          </Row>

          <Row label="PillButton">
            <PillButton active={pillActive} onClick={() => setPillActive((v) => !v)}>
              pill sm
            </PillButton>
            <PillButton variant="tab" size="md" active={!pillActive} onClick={() => setPillActive((v) => !v)}>
              tab md
            </PillButton>
          </Row>

          <Row label="IconButton">
            <IconButton size="icon" aria-label="add">
              <PlusIcon className="w-5 h-5" />
            </IconButton>
            <IconButton variant="accent" size="icon" aria-label="add accent">
              <PlusIcon className="w-5 h-5" />
            </IconButton>
            <IconButton variant="row-action" aria-label="row action">
              <PlusIcon className="w-4 h-4" />
            </IconButton>
          </Row>

          <Row label="ListButton">
            <ListButton variant="card" className="max-w-[200px]">
              <span className="text-sm text-white">card</span>
            </ListButton>
            <ListButton variant="compact" className="max-w-[160px]">
              <span className="text-sm text-white">compact</span>
            </ListButton>
            <div className="glass rounded-xl p-3 max-w-[200px]">
              <ListButton variant="flat">
                <span className="text-sm text-white">flat in card</span>
              </ListButton>
            </div>
          </Row>

          <Row label="MotionButton">
            <MotionButton variant="primary" whileTap={{ scale: 0.97 }}>
              MotionButton
            </MotionButton>
          </Row>

          <Row label="CloseButton · ToolbarButton · ConfirmDelete">
            <CloseButton onClick={() => {}} />
            <ToolbarButton title="duplicate">
              <DocumentDuplicateIcon className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton tone="danger" title="delete">
              <TrashIcon className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ConfirmDeleteButton onConfirm={() => {}} />
            <div className="relative w-24 h-10 rounded-xl border border-(--color_border)">
              <ConfirmDeleteButton variant="overlay" onConfirm={() => {}} />
            </div>
          </Row>

          <Row label="ButtonLink">
            <ButtonLink to="/uikit" variant="soft" fullWidth={false}>
              Link → /uikit
            </ButtonLink>
          </Row>
        </UiKitSection>

        <UiKitSection id="buttons-legacy" title="Legacy buttons" path="GhostButton · AccentButton">
          <p className="text-xs text-(--color_text_muted)">
            Предпочитайте <code className="font-mono">Button</code> с нужным variant.
          </p>
          <Row>
            <GhostButton variant="dashed">Ghost dashed</GhostButton>
          </Row>
          <Row>
            <GhostButton variant="solid">Ghost solid</GhostButton>
            <GhostButton variant="outline-accent">outline-accent</GhostButton>
          </Row>
          <Row>
            <AccentButton size="sm">AccentButton sm</AccentButton>
            <AccentButton>AccentButton md</AccentButton>
          </Row>
        </UiKitSection>

        <UiKitSection id="badges" title="Badge" path="@/components/ui/Badge">
          <Row>
            <Badge count={3} size="xs" />
            <Badge count={12} size="sm" />
            <Badge count={120} size="md" />
          </Row>
        </UiKitSection>

        <UiKitSection id="toggles" title="Switch & toggles" path="Switch · Tabs · ToggleGroup">
          <Row label="Switch">
            <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
            <Switch checked={!switchOn} onCheckedChange={() => setSwitchOn((v) => !v)} size="sm" />
          </Row>

          <DemoBox>
            <Tabs
              tabs={[
                { id: 'one' as const, label: 'Первая' },
                { id: 'two' as const, label: 'Вторая' },
                { id: 'three' as const, label: 'Третья' },
              ]}
              active={tab}
              onChange={setTab}
            />
          </DemoBox>

          <DemoBox>
            <Tabs
              variant="underline"
              tabs={[
                { id: 'one' as const, label: 'Underline' },
                { id: 'two' as const, label: 'Таб 2' },
              ]}
              active={tab === 'three' ? 'one' : tab}
              onChange={setTab}
            />
          </DemoBox>

          <TabCard
            tabs={[
              { id: 'a' as const, label: 'Вкладка A' },
              { id: 'b' as const, label: 'Вкладка B' },
            ]}
            active={tabCard}
            onChange={setTabCard}
          >
            <p className="text-sm text-(--color_text_muted) p-4">Контент TabCard: {tabCard}</p>
          </TabCard>

          <ToggleGroup
            options={[
              { value: 'opt1', label: 'Опция 1' },
              { value: 'opt2', label: 'Опция 2' },
              { value: 'opt3', label: 'Опция 3' },
            ]}
            value={toggleVal}
            onChange={setToggleVal}
            cols={3}
          />

          <ToggleGroup
            joined
            options={[
              { value: 'j1', label: 'Joined 1' },
              { value: 'j2', label: 'Joined 2' },
            ]}
            value={joinedToggle}
            onChange={setJoinedToggle}
            cols={2}
          />

          <GenderToggle value={gender} onChange={setGender} />
        </UiKitSection>

        <UiKitSection id="inputs" title="Inputs" path="FieldLabel · Input · Textarea · SearchInput · NumberInput · PhoneInput · DatePickerField · TimeInput">
          <DemoBox>
            <FieldLabel variant="section">Section — заголовок блока</FieldLabel>
            <p className="text-sm text-(--color_text_muted)">Контент секции</p>
          </DemoBox>
          <DemoBox>
            <FieldLabel variant="field">Field — подпись поля</FieldLabel>
            <SearchInput value="" onChange={() => {}} placeholder="Контрол ниже" clearable={false} />
          </DemoBox>
          <Input label="Input" placeholder="Текст…" />
          <Input label="С ошибкой" error="Обязательное поле" placeholder="…" />
          <Textarea label="Textarea" placeholder="Многострочный текст…" rows={3} />
          <Textarea bare placeholder="Textarea bare (чат)" rows={1} className="bg-transparent border-none text-sm resize-none" />
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск…"
            clearable
          />
          <div className="max-w-[120px]">
            <NumberInput placeholder="0" defaultValue={42} />
          </div>
          <PhoneInput value={phone} onChange={setPhone} />
          <div className="grid grid-cols-2 gap-2 max-w-[320px]">
            <div>
              <label className="block text-xs text-(--color_text_muted) mb-1">DatePickerField</label>
              <DatePickerField
                selected={pickerDate}
                onChange={(d) => setPickerDate(d)}
                dateFormat="d MMM yyyy"
              />
            </div>
            <div>
              <label className="block text-xs text-(--color_text_muted) mb-1">TimeInput</label>
              <TimeInput value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
        </UiKitSection>

        <UiKitSection id="pickers" title="Pickers" path="Select · Combobox · Listbox · TemplatePicker">
          <Select
            label="Select (input)"
            value={selectVal}
            options={SELECT_OPTIONS}
            onChange={setSelectVal}
          />
          <Select
            label="Select (card)"
            variant="card"
            value={selectVal}
            options={SELECT_OPTIONS}
            onChange={setSelectVal}
          />
          <UiCombobox
            value={comboVal}
            options={COMBO_OPTIONS}
            onChange={setComboVal}
            placeholder="Combobox — упражнение"
          />
          <UiListbox value={listVal} options={LISTBOX_OPTIONS} onChange={setListVal} placeholder="Listbox" />
          <TemplatePicker templates={MOCK_TEMPLATES} value={templateId} onChange={setTemplateId} />
        </UiKitSection>

        <UiKitSection id="layout" title="Cards & sections" path="Card · SectionCard · SectionGroup">
          <Card className="p-4">
            <CardHeader title="Card + CardHeader" description="cardClass для кастомных обёрток" />
            <p className="text-sm text-(--color_text_muted)">
              <code className="font-mono text-[11px]">{cardClass}</code>
            </p>
          </Card>

          <SectionCard title="SectionCard">
            <SectionCardRow
              label="Строка с Switch"
              description="Описание опции"
              trailing={<Switch checked={switchOn} onCheckedChange={setSwitchOn} size="sm" />}
            />
            <SectionCardRow
              label="Приглушённая"
              dimmed
              showDivider={false}
              trailing={<span className="text-xs text-(--color_text_muted)">значение</span>}
            />
          </SectionCard>

          <SectionGroup title="SectionGroup" description="Подзаголовок группы">
            <p className="text-sm text-white">Контент внутри группы</p>
          </SectionGroup>

          <SectionBreak />
          <SectionDivider />

          <FloatingPanel className="rounded-xl">
            <IconButton size="icon" aria-label="demo">
              <PlusIcon className="w-5 h-5" />
            </IconButton>
            <CloseButton onClick={() => {}} />
          </FloatingPanel>
        </UiKitSection>

        <UiKitSection id="blocks" title="Blocks" path="AnimatedBlock · CollapsibleBlock · ConfirmDeleteWrapper">
          <Button variant="secondary" size="sm" fullWidth={false} onClick={() => setShowAnimated((v) => !v)}>
            Toggle AnimatedBlock
          </Button>
          <AnimatePresence>
            {showAnimated && (
              <AnimatedBlock className="glass rounded-xl p-4 text-sm text-white">
                AnimatedBlock — enter/exit
              </AnimatedBlock>
            )}
          </AnimatePresence>

          <CollapsibleBlock title="CollapsibleBlock" defaultOpen>
            <p className="text-sm text-(--color_text_muted)">Скрываемый контент внутри Disclosure.</p>
          </CollapsibleBlock>

          <ConfirmDeleteWrapper onConfirm={() => {}} outerClassName="max-w-sm">
            <div className="p-4 flex items-center justify-between gap-2">
              <span className="text-sm text-white">Строка с ConfirmDeleteWrapper</span>
              <ConfirmDeleteWrapper.Trigger />
            </div>
          </ConfirmDeleteWrapper>
        </UiKitSection>

        <UiKitSection id="ai" title="AI UI" path="AiSheetHeader · AiLoadingView · AiCostNotice">
          <AiSheetHeader icon={<SparklesIcon className="w-4 h-4 text-emerald-400" />} title="ИИ-помощник" balance={120} />
          <AiSheetHeader
            icon={<SparklesIcon className="w-4 h-4 text-red-400" />}
            title="Недостаточно средств"
            balance={5}
            hasEnoughBalance={false}
          />
          <AiCostNotice cost={15} actionLabel="генерации плана" />
          <DemoBox>
            <AiLoadingView steps={AI_LOADING_STEPS} />
          </DemoBox>
        </UiKitSection>

        <UiKitSection id="data" title="Charts & loading" path="LineChart · RouteLoading · UiModeCard">
          <LineChart series={CHART_SERIES} valueKey="volume" dates={CHART_DATES} />
          <DemoBox className="h-32 flex items-center justify-center p-0 overflow-hidden">
            <RouteLoading />
          </DemoBox>
          <div className="grid gap-2 sm:grid-cols-3">
            {UI_MODE_ORDER.map((mode) => (
              <UiModeCard key={mode} mode={mode} ctx="athlete" onClick={() => {}} />
            ))}
          </div>
        </UiKitSection>

        <UiKitSection id="spinners" title="LoadingSpinner" path="@/components/ui/LoadingSpinner">
          <Row label="sizes (accent)">
            {SPINNER_SIZES.map((size) => (
              <LoadingSpinner key={size} size={size} />
            ))}
          </Row>
          <div className="flex flex-wrap gap-4">
            {SPINNER_VARIANTS.map((variant) => (
              <div key={variant} className="flex flex-col items-center gap-1">
                <LoadingSpinner size="md" variant={variant} />
                <span className="text-[10px] text-(--color_text_muted)">{variant}</span>
              </div>
            ))}
          </div>
        </UiKitSection>

        <UiKitSection id="calendar" title="Calendar" path="@/components/ui/Calendar">
          <p className="text-xs text-(--color_text_muted)">mode=load (атлет)</p>
          <Calendar
            mode="load"
            selectedDate={calendarDate}
            days={calendarDays}
            onSelect={(day) => setCalendarDate(day.date)}
          />
          <p className="text-xs text-(--color_text_muted)">mode=count (тренер)</p>
          <Calendar
            mode="count"
            selectedDate={calendarDate}
            days={trainerCalendarDays}
            onSelect={(day) => setCalendarDate(day.date)}
          />
        </UiKitSection>

        <UiKitSection
          id="chips"
          title="Chips"
          path="ChoiceChips · ChipScrollRow"
        >
          <Row label="ChoiceChips pill">
            <ChoiceChips
              options={choicePillOptions}
              value={choicePill}
              onChange={setChoicePill}
            />
          </Row>
          <DemoBox>
            <ChoiceChips
              variant="tile"
              label="ChoiceChips tile"
              options={choiceTileOptions}
              value={choiceTile}
              onChange={setChoiceTile}
            />
          </DemoBox>
          <Row label="ChipScrollRow (pill)">
            <ChipScrollRow chips={chipItems} activeKey={chipKey} onChipClick={setChipKey} />
          </Row>
          <Row label="ChipScrollRow (цветные)">
            <ChipScrollRow
              colored
              edgeFade
              chips={chipColoredItems}
              activeKey={chipColoredKey}
              onChipClick={setChipColoredKey}
            />
          </Row>
        </UiKitSection>

        <UiKitSection id="catalog" title="Полный каталог" path="apps/web/src/components/ui/">
          <p className="text-sm text-(--color_text_muted) mb-3">
            Все React-компоненты из <code className="font-mono">components/ui/</code> показаны выше.
            Не в каталоге: <code className="font-mono">buttonStyles.ts</code> (утилиты классов),{' '}
            <code className="font-mono">confirmDeleteOpenEvent.ts</code> (событие).
          </p>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {COMPONENT_CATALOG.map((name) => (
              <li
                key={name}
                className="text-[11px] font-mono px-2 py-1 rounded-md bg-(--color_bg_card_hover) text-(--color_text_muted)"
              >
                {name}
              </li>
            ))}
          </ul>
        </UiKitSection>
      </div>
    </Screen>
  );
}
