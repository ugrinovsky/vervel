import { useRef, useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router';
import ButtonLink from '@/components/ui/ButtonLink';
import { motion } from 'framer-motion';
import VerveLogo from '@/components/VerveLogo/VerveLogo';
import { useAuth } from '@/contexts/AuthContext';
import LandingPhoneMock from './LandingPhoneMock';
import './LandingScreen.css';

// ── Скриншоты ──────────────────────────────────────────────────────────────
// Уже готовые:
import screenshotAvatarAthleteHome from './assets/avatar.png';
import screenshotAnalytics from './assets/analytics.png';
//
// Добавь скрин в assets/ и раскомментируй нужный импорт.
// Потом замени undefined на переменную в SHOTS ниже.
//
// import screenshotAthleteCalendar     from './assets/athlete-calendar.png';
// import screenshotAthleteWorkout      from './assets/athlete-workout.png';
// import screenshotAthleteProgression  from './assets/athlete-progression.png';
// import screenshotAthleteStreak       from './assets/athlete-streak.png';
// import screenshotAthleteTeam         from './assets/athlete-team.png';
// import screenshotAthleteDialogs      from './assets/athlete-dialogs.png';
//
// import screenshotTrainerToday        from './assets/trainer-today.png';
// import screenshotTrainerAthletes     from './assets/trainer-athletes.png';
// import screenshotTrainerAthlDetail   from './assets/trainer-athlete-detail.png';
// import screenshotTrainerGroups       from './assets/trainer-groups.png';
// import screenshotTrainerTemplates    from './assets/trainer-templates.png';
// import screenshotTrainerCalendar     from './assets/trainer-calendar.png';
// import screenshotTrainerLibrary      from './assets/trainer-library.png';
// import screenshotTrainerCrm          from './assets/trainer-crm.png';
// import screenshotTrainerLeads        from './assets/trainer-leads.png';

const SHOTS = {
  // ── Атлет ──
  avatarHome: screenshotAvatarAthleteHome, // ✅
  analytics: screenshotAnalytics, // ✅
  athleteCalendar: undefined as string | undefined, // assets/athlete-calendar.png
  athleteWorkout: undefined as string | undefined, // assets/athlete-workout.png
  athleteProgression: undefined as string | undefined, // assets/athlete-progression.png
  athleteStreak: undefined as string | undefined, // assets/athlete-streak.png
  athleteTeam: undefined as string | undefined, // assets/athlete-team.png
  athleteDialogs: undefined as string | undefined, // assets/athlete-dialogs.png
  // ── Тренер ──
  trainerToday: undefined as string | undefined, // assets/trainer-today.png
  trainerAthletes: undefined as string | undefined, // assets/trainer-athletes.png
  trainerAthlDetail: undefined as string | undefined, // assets/trainer-athlete-detail.png
  trainerGroups: undefined as string | undefined, // assets/trainer-groups.png
  trainerTemplates: undefined as string | undefined, // assets/trainer-templates.png
  trainerCalendar: undefined as string | undefined, // assets/trainer-calendar.png
  trainerLibrary: undefined as string | undefined, // assets/trainer-library.png
  trainerCrm: undefined as string | undefined, // assets/trainer-crm.png
  trainerLeads: undefined as string | undefined, // assets/trainer-leads.png
};

// ── Анимации ───────────────────────────────────────────────────────────────

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6, delay },
  };
}

function fadeIn(delay = 0) {
  return {
    initial: { opacity: 0 },
    whileInView: { opacity: 1 },
    viewport: { once: true },
    transition: { duration: 0.7, delay },
  };
}

// ── Утилиты ────────────────────────────────────────────────────────────────

function Wrap({
  children,
  pt = 72,
  pb = 72,
  id,
  className,
}: {
  children: React.ReactNode;
  pt?: number;
  pb?: number;
  id?: string;
  className?: string;
}) {
  return (
    <div
      id={id}
      className={className}
      style={{ position: 'relative', zIndex: 1, paddingTop: pt, paddingBottom: pb }}
    >
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px' }}>{children}</div>
    </div>
  );
}

function Rule() {
  return <div className="lnd-rule" />;
}

function Em({ children }: { children: React.ReactNode }) {
  return <span className="lnd-em">{children}</span>;
}
function AthlEm({ children }: { children: React.ReactNode }) {
  return <span className="lnd-em-athl">{children}</span>;
}
function TrnrEm({ children }: { children: React.ReactNode }) {
  return <span className="lnd-em-trnr">{children}</span>;
}

function Tag({
  text,
  variant = 'default',
}: {
  text: string;
  variant?: 'default' | 'athlete' | 'trainer' | 'ai';
}) {
  return <div className={`lnd-tag lnd-tag--${variant}`}>{text}</div>;
}

function Check({
  text,
  variant = 'default',
}: {
  text: string;
  variant?: 'default' | 'athlete' | 'trainer';
}) {
  return (
    <div className="lnd-check">
      <span className={`lnd-check-icon lnd-check-icon--${variant}`}>✓</span>
      <span>{text}</span>
    </div>
  );
}

// Слот скриншота: real screenshot или красивый placeholder
function PhoneSlot({
  src,
  name,
  label,
  h = 500,
  w = 220,
  dim = false,
  shrink = 1,
  mt = 0,
  zIndex = 1,
}: {
  src?: string;
  name: string;
  label?: string;
  h?: number;
  w?: number;
  dim?: boolean;
  shrink?: number;
  mt?: number;
  zIndex?: number;
}) {
  return (
    <LandingPhoneMock
      src={src}
      icon={src ? undefined : '📱'}
      caption={src ? undefined : name}
      label={label ?? name}
      h={h}
      w={w}
      dim={dim}
      shrink={shrink}
      mt={mt}
      zIndex={zIndex}
    />
  );
}

// Большой showcase-блок: телефон + текст (или наоборот)
function Showcase({
  flip = false,
  phones,
  children,
}: {
  flip?: boolean;
  phones: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.div {...fadeUp()} className={`lnd-showcase${flip ? ' lnd-showcase--flip' : ''}`}>
      <div className="lnd-showcase-phones">{phones}</div>
      <div className="lnd-showcase-text">{children}</div>
    </motion.div>
  );
}

// ── Компонент ──────────────────────────────────────────────────────────────

export default function LandingScreen() {
  const { user } = useAuth();
  const rootRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onScroll = () => {
      const top = el.scrollTop;
      setScrolled((prev) => {
        if (!prev && top > 60) return true;
        if (prev && top < 30) return false;
        return prev;
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  if (user) return <Navigate to="/home" replace />;

  return (
    <div className="lnd-root" ref={rootRef}>
      {/* Фоновые блобы */}
      <div className="lnd-blob lnd-blob-1" />
      <div className="lnd-blob lnd-blob-2" />
      <div className="lnd-blob lnd-blob-3" />

      {/* ━━━━━━━━━━━━━━━━ NAV ━━━━━━━━━━━━━━━━ */}
      <nav className={`lnd-nav${scrolled ? ' lnd-nav--scrolled' : ''}`}>
        <div className="lnd-nav-inner">
          <VerveLogo className="h-8 w-auto" />
          <div className="lnd-nav-links">
            <a href="#for-athletes" className="lnd-nav-link">
              Атлетам
            </a>
            <a href="#for-trainers" className="lnd-nav-link">
              Тренерам
            </a>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to="/login" className="lnd-btn-ghost">
              Войти
            </Link>
            <Link to="/register" className="lnd-btn-primary">
              Начать
            </Link>
          </div>
        </div>
      </nav>
      <div className="lnd-nav-spacer" />

      {/* ━━━━━━━━━━━━━━━━ HERO ━━━━━━━━━━━━━━━━ */}
      <Wrap pt={80} pb={88} className="lnd-hero-top-wrap">
        <div className="lnd-hero-grid">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.06 }}
              className="lnd-h1"
            >
              Перестань
              <br />
              тренироваться <Em>вслепую</Em>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.14 }}
              className="lnd-hero-desc"
            >
              Дневник тренировок, аналитика нагрузки и ИИ-помощник — для атлета. CRM, абонементы и
              планирование — для тренера. Одно приложение, один аккаунт.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.22 }}
              className="lnd-hero-paths"
            >
              <a href="#for-athletes" className="lnd-path-btn lnd-path-btn--athl">
                <span className="lnd-path-emoji">🏃</span>
                <span className="lnd-path-body">
                  <span className="lnd-path-title">Я атлет</span>
                  <span className="lnd-path-hint">Карта мышц, прогресс, аналитика</span>
                </span>
                <span className="lnd-path-arrow">↓</span>
              </a>
              <a href="#for-trainers" className="lnd-path-btn lnd-path-btn--trnr">
                <span className="lnd-path-emoji">🎯</span>
                <span className="lnd-path-body">
                  <span className="lnd-path-title">Я тренер</span>
                  <span className="lnd-path-hint">Команда, CRM, планы, видео</span>
                </span>
                <span className="lnd-path-arrow">↓</span>
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.36 }}
              style={{ marginTop: 24 }}
            >
              <ButtonLink
                to="/register"
                variant="primary"
                className="lnd-btn-cta"
                style={{
                  borderRadius: 13,
                  padding: '13px 26px',
                  fontSize: 14,
                  fontWeight: 700,
                  display: 'inline-block',
                }}
              >
                Начать бесплатно →
              </ButtonLink>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="lnd-hero-phones"
          >
            <div className="lnd-hero-glow" />
            <PhoneSlot src={SHOTS.avatarHome} name="Карта мышц" h={500} w={220} zIndex={2} />
            <PhoneSlot
              src={SHOTS.analytics}
              name="Аналитика"
              h={500}
              w={220}
              dim
              shrink={0.88}
              mt={60}
            />
          </motion.div>
        </div>
      </Wrap>

      {/* ━━━━━━━━━━━━━━━━ STATS BAR ━━━━━━━━━━━━━━━━ */}
      <Wrap pt={0} pb={0}>
        <motion.div {...fadeIn()} className="lnd-stats-bar">
          {(
            [
              { n: '3 роли ИИ', label: 'фото, текст, генерация' },
              { n: 'CRM', label: 'заявки и абонементы' },
              { n: '2 роли', label: 'атлет и тренер' },
              { n: 'PWA', label: 'без магазина приложений' },
            ] as const
          ).map(({ n, label }) => (
            <div key={n} className="lnd-stat-item">
              <span className="lnd-stat-n">{n}</span>
              <span className="lnd-stat-label">{label}</span>
            </div>
          ))}
        </motion.div>
      </Wrap>

      <Rule />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           СЕКЦИЯ: ДЛЯ АТЛЕТА
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Wrap id="for-athletes" pt={80} pb={24}>
        <motion.div {...fadeUp()}>
          <Tag text="🏃 Для атлета" variant="athlete" />
          <h2 className="lnd-h2">
            Видишь каждый подход.
            <br />
            <AthlEm>Видишь прогресс.</AthlEm>
          </h2>
          <p className="lnd-sub">
            Семь экранов вместо таблиц, заметок и мессенджера с тренером — в одной нижней навигации.
          </p>
        </motion.div>
      </Wrap>

      {/* Showcase 1 — Карта мышц + Календарь */}
      <Wrap pt={0} pb={0}>
        <Showcase
          phones={
            <>
              <PhoneSlot src={SHOTS.avatarHome} name="Карта мышц" h={520} w={228} zIndex={2} />
              <PhoneSlot
                src={SHOTS.athleteCalendar}
                name="Календарь"
                h={480}
                w={210}
                dim
                shrink={0.9}
                mt={50}
              />
            </>
          }
        >
          <div className="lnd-showcase-num">01</div>
          <h3 className="lnd-showcase-h3">
            Карта мышц
            <br />и <AthlEm>восстановление</AthlEm>
          </h3>
          <p className="lnd-showcase-desc">
            Главный экран — живая 2D-карта тела. Красные зоны только нагрузил, зелёные готовы к
            работе. Видишь, что болит, и знаешь, когда снова в зал. Рядом — календарь активности с
            цветовой раскраской по нагрузке.
          </p>
          <div className="lnd-check-list">
            <Check text="Цветовые зоны по 10+ группам мышц и их состоянию" variant="athlete" />
            <Check text="Индикатор недельной прогрессии (серии недель)" variant="athlete" />
            <Check
              text="Подсказки по пропущенным данным: веса, RPE, пустые тренировки"
              variant="athlete"
            />
            <Check text="Расписание тренировок от тренера прямо на главной" variant="athlete" />
            <Check
              text="Календарь: день раскрашен по нагрузке → открыл → упражнения, веса, правки"
              variant="athlete"
            />
          </div>
        </Showcase>
      </Wrap>

      {/* Showcase 2 — Тренировка + ИИ */}
      <Wrap pt={20} pb={0}>
        <Showcase
          flip
          phones={
            <PhoneSlot
              src={SHOTS.athleteWorkout}
              name="Новая тренировка"
              h={520}
              w={228}
              zIndex={2}
            />
          }
        >
          <div className="lnd-showcase-num">02</div>
          <h3 className="lnd-showcase-h3">
            Тренировка
            <br />
            за <AthlEm>60 секунд</AthlEm>
          </h3>
          <p className="lnd-showcase-desc">
            Три способа занести тренировку: вручную из библиотеки упражнений, через фото
            тетради/скрина или просто текстом — ИИ разберёт и заполнит форму. Либо сгенерирует план
            с нуля по запросу.
          </p>
          <div className="lnd-check-list">
            <Check text="Три типа тренировок: силовая, CrossFit, кардио" variant="athlete" />
            <Check text="ИИ-распознавание с фото листа, тетради или скрина" variant="athlete" />
            <Check
              text="ИИ-парсинг текста: вставил описание — получил упражнения"
              variant="athlete"
            />
            <Check
              text="ИИ-генерация: «грудь 45 мин, средний уровень» → готовый план"
              variant="athlete"
            />
            <Check
              text="Черновик сохраняется автоматически — не потеряешь незаконченное"
              variant="athlete"
            />
          </div>
        </Showcase>
      </Wrap>

      {/* Showcase 3 — Аналитика + Прогрессия */}
      <Wrap pt={20} pb={0}>
        <Showcase
          phones={
            <>
              <PhoneSlot src={SHOTS.analytics} name="Аналитика" h={520} w={228} zIndex={2} />
              <PhoneSlot
                src={SHOTS.athleteProgression}
                name="Силовой журнал"
                h={480}
                w={210}
                dim
                shrink={0.9}
                mt={50}
              />
            </>
          }
        >
          <div className="lnd-showcase-num">03</div>
          <h3 className="lnd-showcase-h3">
            Аналитика с
            <br />
            <AthlEm>периодизацией</AthlEm>
          </h3>
          <p className="lnd-showcase-desc">
            Не просто «сколько раз сходил». Модель ATL/CTL/TSB показывает твою форму, накопленную
            усталость и когда пора сбавить или добавить. Силовой журнал с графиками прогресса по
            каждому упражнению.
          </p>
          <div className="lnd-check-list">
            <Check text="Объём, нагрузка, частота за неделю / месяц / год" variant="athlete" />
            <Check
              text="ATL / CTL / TSB — модель усталости и готовности к нагрузке"
              variant="athlete"
            />
            <Check text="RPE-отслеживание и зоны нагрузки" variant="athlete" />
            <Check
              text="Силовой журнал: вес × подходы × повторения, графики прогресса"
              variant="athlete"
            />
            <Check
              text="Эталон-упражнений: «жим», «bench press» — одна статистика"
              variant="athlete"
            />
          </div>
        </Showcase>
      </Wrap>

      {/* Бенто-сетка: Стрики / Команда / Диалоги / ИИ-чат */}
      <Wrap pt={24} pb={80}>
        <motion.div {...fadeUp()} className="lnd-bento-grid">
          <div className="lnd-bento-card lnd-bento-card--athl">
            <div className="lnd-bento-phone">
              <PhoneSlot src={SHOTS.athleteStreak} name="Стрики и XP" h={290} w={130} />
            </div>
            <div className="lnd-bento-body">
              <div className="lnd-bento-ico">🏆</div>
              <h4 className="lnd-bento-title">Стрики, XP и достижения</h4>
              <p className="lnd-bento-desc">
                Стрики по неделям, опыт, уровни и бейджи. Два режима: «Простой» (3 тренировки/нед) и
                «Интенсивный» (5). Лидерборд в группе по 1RM, объёму и сериям недель.
              </p>
            </div>
          </div>

          <div className="lnd-bento-card lnd-bento-card--athl">
            <div className="lnd-bento-phone">
              <PhoneSlot src={SHOTS.athleteTeam} name="Моя команда" h={290} w={130} />
            </div>
            <div className="lnd-bento-body">
              <div className="lnd-bento-ico">👥</div>
              <h4 className="lnd-bento-title">Команда и тренер</h4>
              <p className="lnd-bento-desc">
                Твои тренеры, учебные группы и расписание от тренера — в одном разделе. Принять
                приглашение по ссылке или QR за секунду.
              </p>
            </div>
          </div>

          <div className="lnd-bento-card lnd-bento-card--athl">
            <div className="lnd-bento-phone">
              <PhoneSlot src={SHOTS.athleteDialogs} name="Диалоги" h={290} w={130} />
            </div>
            <div className="lnd-bento-body">
              <div className="lnd-bento-ico">💬</div>
              <h4 className="lnd-bento-title">Диалоги без мессенджеров</h4>
              <p className="lnd-bento-desc">
                Чаты с тренером и в группах прямо здесь. Бейдж непрочитанного на навигации, отправка
                скринов тренировок и медиа.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Wide card — ИИ-чат */}
        <motion.div {...fadeUp(0.08)} style={{ marginTop: 14 }}>
          <div className="lnd-bento-card lnd-bento-card--wide lnd-bento-card--ai-wide">
            <div className="lnd-bento-wide-text">
              <div className="lnd-bento-ico">🤖</div>
              <h4 className="lnd-bento-title">ИИ-ассистент в диалогах</h4>
              <p className="lnd-bento-desc" style={{ maxWidth: 380 }}>
                Вопросы по технике, восстановлению и питанию — прямо в чате приложения. ИИ знает
                твою историю тренировок и отвечает в контексте. Работает за баланс AI-кошелька.
              </p>
            </div>
            <div className="lnd-bento-wide-checks">
              <Check text="Вопросы по технике упражнений" variant="athlete" />
              <Check text="Советы по восстановлению на основе нагрузки" variant="athlete" />
              <Check text="Контекст твоего плана и последних тренировок" variant="athlete" />
              <Check text="Push-уведомления о сообщениях от тренера" variant="athlete" />
            </div>
          </div>
        </motion.div>
      </Wrap>

      <Rule />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           СЕКЦИЯ: ДЛЯ ТРЕНЕРА
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Wrap id="for-trainers" pt={80} pb={24}>
        <motion.div {...fadeUp()}>
          <Tag text="🎯 Для тренера" variant="trainer" />
          <h2 className="lnd-h2">
            Управляй командой.
            <br />
            <TrnrEm>Не администрируй.</TrnrEm>
          </h2>
          <p className="lnd-sub">
            Восемь экранов вместо таблиц, мессенджеров и отдельного CRM — в инструменте, который уже
            знает твоих атлетов.
          </p>
        </motion.div>
      </Wrap>

      {/* Showcase 1 — Сегодня + Атлеты */}
      <Wrap pt={0} pb={0}>
        <Showcase
          phones={
            <>
              <PhoneSlot src={SHOTS.trainerToday} name="Сегодня" h={520} w={228} zIndex={2} />
              <PhoneSlot
                src={SHOTS.trainerAthletes}
                name="Атлеты"
                h={480}
                w={210}
                dim
                shrink={0.9}
                mt={50}
              />
            </>
          }
        >
          <div className="lnd-showcase-num lnd-showcase-num--trnr">01</div>
          <h3 className="lnd-showcase-h3">
            Утро тренера —
            <br />
            <TrnrEm>всё на одном экране</TrnrEm>
          </h3>
          <p className="lnd-showcase-desc">
            Открыл приложение — видишь сколько тренировок сегодня, у кого они, кто не ответил и лиды
            которые ждут звонка. Ни один атлет и ни один контакт не выпадут из поля зрения.
          </p>
          <div className="lnd-check-list">
            <Check text="Сводка тренировок на сегодня по времени и атлету" variant="trainer" />
            <Check text="Счётчики атлетов, групп, непрочитанных сообщений" variant="trainer" />
            <Check text="Лиды с напоминанием о follow-up прямо на главной" variant="trainer" />
            <Check text="Быстрый доступ к добавлению атлета или нового лида" variant="trainer" />
            <Check
              text="Список атлетов в сетке или списке с поиском, статусами и бейджами"
              variant="trainer"
            />
          </div>
        </Showcase>
      </Wrap>

      {/* Showcase 2 — Детали атлета + Группы */}
      <Wrap pt={20} pb={0}>
        <Showcase
          flip
          phones={
            <>
              <PhoneSlot
                src={SHOTS.trainerAthlDetail}
                name="Атлет — аналитика"
                h={520}
                w={228}
                zIndex={2}
              />
              <PhoneSlot
                src={SHOTS.trainerGroups}
                name="Группы"
                h={480}
                w={210}
                dim
                shrink={0.9}
                mt={50}
              />
            </>
          }
        >
          <div className="lnd-showcase-num lnd-showcase-num--trnr">02</div>
          <h3 className="lnd-showcase-h3">
            Атлеты и группы
            <br />
            <TrnrEm>как надо</TrnrEm>
          </h3>
          <p className="lnd-showcase-desc">
            Карточка атлета — это аналитика, карта восстановления мышц и полная история активности.
            Как будто видишь их тренировочный журнал изнутри. Группы с лидербордами и групповым
            чатом.
          </p>
          <div className="lnd-check-list">
            <Check
              text="Карточка атлета: аналитика, активность, карта мышц — три вкладки"
              variant="trainer"
            />
            <Check text="Прямой чат и видеозвонок из карточки атлета" variant="trainer" />
            <Check text="Редактирование никнейма, назначение тренировок атлету" variant="trainer" />
            <Check text="Группы: участники, групповой чат, видеозвонок" variant="trainer" />
            <Check text="Лидерборд в группе по 1RM, объёму, стрикам и XP" variant="trainer" />
            <Check text="QR-код и ссылка-приглашение для новых атлетов" variant="trainer" />
          </div>
        </Showcase>
      </Wrap>

      {/* Showcase 3 — Шаблоны + Календарь */}
      <Wrap pt={20} pb={0}>
        <Showcase
          phones={
            <>
              <PhoneSlot src={SHOTS.trainerTemplates} name="Шаблоны" h={520} w={228} zIndex={2} />
              <PhoneSlot
                src={SHOTS.trainerCalendar}
                name="Календарь"
                h={480}
                w={210}
                dim
                shrink={0.9}
                mt={50}
              />
            </>
          }
        >
          <div className="lnd-showcase-num lnd-showcase-num--trnr">03</div>
          <h3 className="lnd-showcase-h3">
            Шаблоны и
            <br />
            <TrnrEm>планирование</TrnrEm>
          </h3>
          <p className="lnd-showcase-desc">
            Создай шаблон руками или попроси ИИ — за секунды получи готовый план с упражнениями,
            подходами и весами. Потом назначь атлетам и группам прямо из timeline-календаря.
          </p>
          <div className="lnd-check-list">
            <Check
              text="Шаблоны: силовые, CrossFit, кардио с параметрами упражнений"
              variant="trainer"
            />
            <Check text="ИИ-генерация, распознавание с фото, парсинг текста" variant="trainer" />
            <Check text="Календарь с timeline-видом 7:00–23:00" variant="trainer" />
            <Check
              text="Назначение тренировки атлету или группе одним действием"
              variant="trainer"
            />
            <Check text="Отметка дней отдыха, удаление и изменение плана" variant="trainer" />
          </div>
        </Showcase>
      </Wrap>

      {/* Showcase 4 — CRM + Абонементы (ключевой дифференциатор) */}
      <Wrap pt={20} pb={0}>
        <Showcase
          flip
          phones={
            <>
              <PhoneSlot src={SHOTS.trainerCrm} name="CRM-дашборд" h={520} w={228} zIndex={2} />
              <PhoneSlot
                src={SHOTS.trainerLeads}
                name="Лиды"
                h={480}
                w={210}
                dim
                shrink={0.9}
                mt={50}
              />
            </>
          }
        >
          <div className="lnd-showcase-num lnd-showcase-num--trnr">04</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <h3 className="lnd-showcase-h3" style={{ marginBottom: 0 }}>
              CRM прямо
              <br />в <TrnrEm>приложении</TrnrEm>
            </h3>
            <span className="lnd-new-badge">NEW</span>
          </div>
          <p className="lnd-showcase-desc">
            Три вкладки в одном экране: заявки по воронке с напоминаниями, абонементы с контролем
            остатков занятий, аналитика конверсии и удержания — всё без сторонних CRM.
          </p>
          <div className="lnd-check-list">
            <Check
              text="Заявки: воронка «Новый → Контакт → Пробник → Клиент» с 5 статусами"
              variant="trainer"
            />
            <Check
              text="Follow-up напоминания: поставил дату — заявка подсветится в нужный день"
              variant="trainer"
            />
            <Check text="Конвертация лида в атлета через ссылку-приглашение" variant="trainer" />
            <Check
              text="Абонементы: пакеты занятий, списание за тренировку, архив"
              variant="trainer"
            />
            <Check
              text="Быстрое списание прямо из CRM-списка — без входа в карточку атлета"
              variant="trainer"
            />
            <Check
              text="Аналитика: конверсия воронки, активные абонементы, статусы атлетов"
              variant="trainer"
            />
          </div>
        </Showcase>
      </Wrap>

      {/* Бенто-сетка: База / Видеозвонки / Диалоги */}
      <Wrap pt={24} pb={80}>
        <motion.div {...fadeUp()} className="lnd-bento-grid">
          <div className="lnd-bento-card lnd-bento-card--trnr">
            <div className="lnd-bento-phone">
              <PhoneSlot src={SHOTS.trainerLibrary} name="База упражнений" h={290} w={130} />
            </div>
            <div className="lnd-bento-body">
              <div className="lnd-bento-ico">📚</div>
              <h4 className="lnd-bento-title">База упражнений</h4>
              <p className="lnd-bento-desc">
                Сотни упражнений: фото, техника, целевые мышцы, оборудование, сложность. Фильтры по
                мышечным зонам и категориям. Из базы — сразу в шаблон.
              </p>
            </div>
          </div>

          <div className="lnd-bento-card lnd-bento-card--trnr">
            <div
              className="lnd-bento-phone"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 64,
                minHeight: 140,
              }}
            >
              📹
            </div>
            <div className="lnd-bento-body">
              <div className="lnd-bento-ico">📹</div>
              <h4 className="lnd-bento-title">Видеозвонки LiveKit</h4>
              <p className="lnd-bento-desc">
                Созвон с атлетом из его карточки или из группового чата — на LiveKit, без внешних
                ссылок и Zoom. Ученик получает входящий вызов прямо в приложении.
              </p>
            </div>
          </div>

          <div className="lnd-bento-card lnd-bento-card--trnr">
            <div className="lnd-bento-phone">
              <LandingPhoneMock icon="💬" caption="Диалоги тренера" h={290} w={130} />
            </div>
            <div className="lnd-bento-body">
              <div className="lnd-bento-ico">💬</div>
              <h4 className="lnd-bento-title">Диалоги без мессенджера</h4>
              <p className="lnd-bento-desc">
                Переписка со всеми атлетами и группами внутри приложения. Счётчик непрочитанного,
                отправка тренировок, медиа и GIF-реакций.
              </p>
            </div>
          </div>
        </motion.div>
      </Wrap>

      <Rule />

      {/* ━━━━━━━━━━━━━━━━ ИИ ━━━━━━━━━━━━━━━━ */}
      <Wrap pt={72} pb={72}>
        <div className="lnd-two-col">
          <motion.div {...fadeUp()}>
            <Tag text="✨ ИИ в приложении" variant="ai" />
            <h2 className="lnd-h2">
              Меньше ввода —<br />
              <Em>больше тренировок</Em>
            </h2>
            <p className="lnd-sub">
              ИИ работает везде: атлету помогает заносить тренировки, тренеру — создавать шаблоны.
              Каждый вид ИИ списывает баланс — прозрачно, пополнение через ЮKassa.
            </p>
            <div className="lnd-ai-list">
              {(
                [
                  {
                    icon: '📷',
                    title: 'Фото → тренировка',
                    desc: 'Сфоткал лист/программу — ИИ разобрал упражнения и подходы, заполнил форму',
                  },
                  {
                    icon: '✍️',
                    title: 'Текст → упражнения',
                    desc: 'Вставил описание из заметок — получил структурированный план',
                  },
                  {
                    icon: '🧠',
                    title: 'Запрос → план',
                    desc: '«Грудь 45 мин, средний уровень» → план с упражнениями, подходами и весами',
                  },
                  {
                    icon: '💬',
                    title: 'ИИ-чат',
                    desc: 'Вопросы по технике, восстановлению и тренировкам прямо в диалогах',
                  },
                  {
                    icon: '🔗',
                    title: 'Умный эталон',
                    desc: '«Жим», «bench press» и «жим лёжа» — одна статистика, не три разных',
                  },
                ] as const
              ).map((item) => (
                <div key={item.title} className="lnd-ai-item">
                  <div className="lnd-ai-ico">{item.icon}</div>
                  <div>
                    <div className="lnd-ai-title">{item.title}</div>
                    <div className="lnd-ai-desc">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div
            {...fadeUp(0.1)}
            style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'flex-end' }}
          >
            <LandingPhoneMock
              h={400}
              w={190}
              icon="📷"
              caption="Фото → форма тренировки"
              label="Распознавание"
              dim
              shrink={0.9}
              mt={40}
            />
            <LandingPhoneMock
              h={460}
              w={190}
              icon="🤖"
              caption="Чат и баланс"
              label="ИИ-чат"
              zIndex={2}
            />
          </motion.div>
        </div>
      </Wrap>

      <Rule />

      {/* ━━━━━━━━━━━━━━━━ PWA + DUAL ROLE ━━━━━━━━━━━━━━━━ */}
      <Wrap pt={72} pb={72}>
        <div className="lnd-two-col">
          <motion.div {...fadeUp()}>
            <Tag text="📲 Веб-приложение" />
            <h2 className="lnd-h2">
              Открыл в браузере —<br />
              <Em>закрепил как приложение</Em>
            </h2>
            <p className="lnd-sub">
              PWA: устанавливается с браузера на iOS и Android без App Store. Один аккаунт — роли
              атлет и тренер с переключением кабинета без выхода.
            </p>
            <div className="lnd-check-list">
              <Check text="Установка на iOS / Android — «Добавить на главный экран»" />
              <Check text="Push-уведомления от тренера, команды и системы" />
              <Check text="Один аккаунт: атлет + тренер, переключение без выхода" />
              <Check text="Регистрация с выбором роли, вход по приглашению тренера" />
              <Check text="AI-кошелёк: баланс, история трат, пополнение через ЮKassa" />
              <Check text="Тёмная и светлая тема на выбор" />
            </div>
          </motion.div>
          <motion.div
            {...fadeUp(0.1)}
            style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center' }}
          >
            <LandingPhoneMock
              h={440}
              w={200}
              icon="📲"
              caption="Добавить на главный экран"
              label="PWA"
              zIndex={2}
            />
            <LandingPhoneMock
              h={400}
              w={200}
              icon="🔔"
              caption="Push из браузера"
              label="Уведомления"
              dim
              shrink={0.92}
              mt={36}
            />
          </motion.div>
        </div>
      </Wrap>

      <Rule />

      {/* ━━━━━━━━━━━━━━━━ FINAL CTA ━━━━━━━━━━━━━━━━ */}
      <Wrap pt={64} pb={96}>
        <motion.div {...fadeUp()} className="lnd-cta-box">
          <div className="lnd-cta-glow" />
          <div className="lnd-cta-pill">Бесплатный старт</div>
          <h2 className="lnd-cta-title">Начни. Это бесплатно.</h2>
          <p className="lnd-cta-desc">
            Регистрация за минуту. Выбери роль — и сразу к делу. Атлет и тренер живут в одном
            аккаунте.
          </p>
          <div className="lnd-cta-btns">
            <Link to="/register" className="lnd-cta-split lnd-cta-split--athl">
              🏃&nbsp; Я атлет →
            </Link>
            <Link to="/register" className="lnd-cta-split lnd-cta-split--trnr">
              🎯&nbsp; Я тренер →
            </Link>
          </div>
          <div style={{ marginTop: 16 }}>
            <Link to="/login" className="lnd-btn-ghost" style={{ fontSize: 13 }}>
              Уже есть аккаунт? Войти
            </Link>
          </div>
        </motion.div>
      </Wrap>

      {/* ━━━━━━━━━━━━━━━━ FOOTER ━━━━━━━━━━━━━━━━ */}
      <footer className="lnd-footer">
        <div className="lnd-footer-inner">
          <VerveLogo className="h-7 w-auto" />
          <span className="lnd-footer-copy">© 2026 Vervel</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link to="/docs/privacy" className="lnd-footer-link">
              Политика конфиденциальности
            </Link>
            <Link to="/docs/offer" className="lnd-footer-link">
              Условия
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
