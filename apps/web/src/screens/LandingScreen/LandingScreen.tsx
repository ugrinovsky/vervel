import { Navigate, Link } from 'react-router';
import { motion } from 'framer-motion';
import VerveLogo from '@/components/VerveLogo/VerveLogo';
import { useAuth } from '@/contexts/AuthContext';
import landingAvatarShot from './assets/avatar.png';
import landingAnalyticsShot from './assets/analytics.png';
import LandingPhoneMock from './LandingPhoneMock';
import './LandingScreen.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function Wrap({
  children,
  pt = 72,
  pb = 72,
}: {
  children: React.ReactNode;
  pt?: number;
  pb?: number;
}) {
  return (
    <div style={{ position: 'relative', zIndex: 1, paddingTop: pt, paddingBottom: pb }}>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 24px' }}>{children}</div>
    </div>
  );
}

function Rule() {
  return <div className="lnd-rule" />;
}

function Tag({ text }: { text: string }) {
  return <div className="lnd-tag">{text}</div>;
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="lnd-h2">{children}</h2>;
}

function Em({ children }: { children: React.ReactNode }) {
  return <span className="lnd-em">{children}</span>;
}

function Sub({ children }: { children: React.ReactNode }) {
  return <p className="lnd-sub">{children}</p>;
}

function Check({ text }: { text: string }) {
  return (
    <div className="lnd-check">
      <span className="lnd-check-icon">✓</span>
      {text}
    </div>
  );
}

function FeatureRow({ items }: { items: Array<{ icon: string; title: string; desc: string }> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item) => (
        <div key={item.title} className="lnd-feature-item">
          <div className="lnd-feature-icon">{item.icon}</div>
          <div>
            <div className="lnd-feature-title">{item.title}</div>
            <div className="lnd-feature-desc">{item.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function fade(delay = 0) {
  return {
    initial: { opacity: 0, y: 14 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.55, delay },
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function LandingScreen() {
  const { user } = useAuth();

  if (user) return <Navigate to="/home" replace />;

  return (
    /*
     * position:fixed + overflow-y:auto — изолированный scroll-контейнер,
     * не зависящий от overflow:hidden на html/body/#root в App.css
     */
    <div className="lnd-root">
      {/* Ambient blobs */}
      <div className="lnd-blob lnd-blob-1" />
      <div className="lnd-blob lnd-blob-2" />

      {/* ── NAV — в стиле нижней навигации ── */}
      <nav className="lnd-nav">
        <div className="lnd-nav-inner">
          <VerveLogo className="h-8 w-auto" />
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to="/login" className="lnd-btn-ghost">
              Войти
            </Link>
            <Link
              to="/register"
              className="lnd-btn-primary main-button"
              style={{
                borderRadius: 10,
                padding: '9px 18px',
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Начать
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <Wrap pt={72} pb={80}>
        <div className="lnd-hero-grid">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lnd-h1"
            >
              Ты тренируешься усердно. <Em>Но растёшь ли ты?</Em>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="lnd-hero-desc"
            >
              Одно приложение для атлета и тренера: <Em>карта мышц и восстановление</Em> на главной,
              календарь нагрузки, аналитика с периодизацией, силовой журнал,{' '}
              <Em>диалоги и видеозвонки</Em>. ИИ заносит тренировку с фото или текста и отвечает в
              чате — без хаоса в мессенджерах.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.22 }}
              style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}
            >
              <Link
                to="/register"
                className="lnd-btn-cta main-button"
                style={{
                  borderRadius: 13,
                  padding: '14px 28px',
                  fontSize: 15,
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Начать бесплатно
              </Link>
              <Link
                to="/login"
                className="lnd-btn-ghost"
                style={{ padding: '14px 28px', fontSize: 15, fontWeight: 600 }}
              >
                Уже есть аккаунт →
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-end',
              position: 'relative',
            }}
          >
            <div className="lnd-hero-glow" />
            <LandingPhoneMock
              h={490}
              w={220}
              src={landingAvatarShot}
              label="Карта мышц"
              zIndex={2}
            />
            <LandingPhoneMock
              h={490}
              w={220}
              src={landingAnalyticsShot}
              label="Аналитика"
              dim
              shrink={0.88}
              mt={56}
            />
          </motion.div>
        </div>
      </Wrap>

      <Rule />

      {/* ── ATHLETE SCREENS ── */}
      <Wrap>
        <motion.div {...fade()} style={{ marginBottom: 44 }}>
          <Tag text="Для атлета" />
          <H2>
            Видишь нагрузку —<br />
            <Em>не гадаешь, что болит</Em>
          </H2>
          <Sub>
            Главный экран с зонами мышц и восстановления, календарь активности, аналитика с
            периодизацией, силовой журнал и связь с тренером — как в реальном приложении, в одной
            нижней навигации.
          </Sub>
        </motion.div>

        <div className="lnd-two-col">
          <motion.div
            {...fade(0.05)}
            style={{ display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'flex-end' }}
          >
            <LandingPhoneMock
              h={450}
              w={196}
              icon="📅"
              caption="Календарь активности"
              label="Активность"
            />
            <LandingPhoneMock
              h={490}
              w={196}
              icon="📊"
              caption="Периодизация и объём"
              label="Аналитика"
              zIndex={2}
            />
          </motion.div>
          <motion.div {...fade(0.1)}>
            <FeatureRow
              items={[
                {
                  icon: '🗺️',
                  title: 'Главная и карта мышц',
                  desc: '2D-аватар показывает, что сейчас под нагрузкой, а что отдохнуло. Подсказки по сериям недель и ИИ-распознаванию.',
                },
                {
                  icon: '💪',
                  title: 'Тренировка за минуту',
                  desc: 'Вручную или через ИИ: фото листа/скрина, текстовое описание или генерация плана по запросу — всё попадает в журнал.',
                },
                {
                  icon: '📅',
                  title: 'Календарь активности',
                  desc: 'День на календаре раскрашен по нагрузке: открыл — упражнения, веса, заметки, правки.',
                },
                {
                  icon: '📊',
                  title: 'Аналитика и форма',
                  desc: 'Объём, зоны, регулярность за неделю/месяц/год. Периодизация CTL/ATL/TSB — когда пора сбавить или добавить.',
                },
                {
                  icon: '🏋️',
                  title: 'Сила и прогресс',
                  desc: 'Журнал весов по упражнениям, графики и сводка; эталон объединяет разные названия одного движения.',
                },
                {
                  icon: '💬',
                  title: 'Диалоги и команда',
                  desc: 'Чаты с тренером и непрочитанные в одном месте — рядом с «Моя команда» в навигации.',
                },
                {
                  icon: '🏆',
                  title: 'Мотивация и группы',
                  desc: 'Стрики, достижения и лидерборды в группах: прогресс по 1RM, относительный объём, серии недель, опыт.',
                },
              ]}
            />
          </motion.div>
        </div>

        <motion.div {...fade(0.15)} className="lnd-phones-row" style={{ marginTop: 36 }}>
          <LandingPhoneMock h={420} w={188} src={landingAvatarShot} label="Карта мышц" />
          <LandingPhoneMock
            h={460}
            w={188}
            icon="💪"
            caption="Новая тренировка + ИИ"
            label="Журнал"
          />
          <LandingPhoneMock h={420} w={188} icon="💬" caption="Диалоги" label="Чаты" />
          <LandingPhoneMock h={420} w={188} icon="🏆" caption="Серии и группы" label="Мотивация" />
        </motion.div>
      </Wrap>

      <Rule />

      {/* ── TRAINER SCREENS ── */}
      <Wrap>
        <motion.div {...fade()} style={{ marginBottom: 44 }}>
          <Tag text="Для тренера" />
          <H2>
            Один день —<br />
            <Em>вся команда на экране</Em>
          </H2>
          <Sub>
            Экран «Сегодня», команда (атлеты и группы), личные чаты с бейджами непрочитанного,
            календарь и библиотека упражнений. Видеозвонок — из карточки атлета или группы, без
            сторонних ссылок.
          </Sub>
        </motion.div>

        <div className="lnd-two-col">
          <motion.div {...fade(0.05)}>
            <FeatureRow
              items={[
                {
                  icon: '⏰',
                  title: 'Сегодня',
                  desc: 'Сводка по тренировкам дня и быстрые переходы — с чего начать утром в кабинете тренера.',
                },
                {
                  icon: '💬',
                  title: 'Диалоги',
                  desc: 'Переписка с атлетами внутри приложения; счётчик непрочитанного в навигации, как в мессенджере.',
                },
                {
                  icon: '👥',
                  title: 'Команда',
                  desc: 'Атлеты и группы в одном разделе: назначение тренировок, приглашения, лидерборды по группе.',
                },
                {
                  icon: '📹',
                  title: 'Видеозвонки',
                  desc: 'Созвон с атлетом или из группы на LiveKit — ученик получает входящий прямо в приложении.',
                },
                {
                  icon: '📋',
                  title: 'Шаблоны',
                  desc: 'Готовые планы: вручную или через ИИ (фото, текст, запрос), затем назначение атлетам и группам из календаря.',
                },
                {
                  icon: '📅',
                  title: 'Календарь тренера',
                  desc: 'Расписание и контекст по дням — рядом с шаблонами и базой в нижней панели.',
                },
                {
                  icon: '📚',
                  title: 'База упражнений',
                  desc: 'Своя библиотека: мышцы, техника, привязка к типам тренировок.',
                },
              ]}
            />
          </motion.div>
          <motion.div
            {...fade(0.1)}
            style={{ display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'flex-end' }}
          >
            <LandingPhoneMock
              h={490}
              w={196}
              icon="⏰"
              caption="Расписание на сегодня"
              label="Сегодня"
              zIndex={2}
            />
            <LandingPhoneMock h={450} w={196} icon="👤" caption="Список атлетов" label="Атлеты" />
          </motion.div>
        </div>

        <motion.div {...fade(0.15)} className="lnd-phones-row" style={{ marginTop: 36 }}>
          <LandingPhoneMock h={420} w={188} icon="⏰" caption="Сводка на сегодня" label="Сегодня" />
          <LandingPhoneMock h={460} w={188} icon="💬" caption="Чаты с атлетами" label="Диалоги" />
          <LandingPhoneMock h={420} w={188} icon="📹" caption="Звонок из карточки" label="Видео" />
          <LandingPhoneMock h={420} w={188} icon="📋" caption="Шаблоны и календарь" label="Планы" />
        </motion.div>
      </Wrap>

      <Rule />

      {/* ── AI ── */}
      <Wrap>
        <div className="lnd-two-col">
          <motion.div {...fade()}>
            <Tag text="ИИ в приложении" />
            <H2>
              Меньше ручного ввода —<br />
              <Em>больше времени в зале</Em>
            </H2>
            <Sub>
              Распознавание и чат списывают баланс; пополнение — через кошелёк и ЮKassa. Сначала
              пробуете, потом решаете, как часто пользоваться.
            </Sub>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <Check text="По фото или скрину — ИИ разбирает лист/программу и заполняет форму тренировки" />
              <Check text="По тексту — вставили описание из заметок, получили упражнения и подходы" />
              <Check text="По запросу — «грудь 45 мин, средний уровень»: сгенерированный план с подходами и весами" />
              <Check text="Тренер в «Шаблонах»: то же распознавание и генерация — черновик шаблона за секунды, потом правки и назначение атлетам" />
              <Check text="ИИ-чат в приложении — вопросы по технике, восстановлению и тренировочному процессу" />
            </div>
          </motion.div>
          <motion.div
            {...fade(0.1)}
            style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'flex-end' }}
          >
            <LandingPhoneMock
              h={400}
              w={190}
              icon="📷"
              caption="Фото → форма"
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

      {/* ── PWA / установка ── */}
      <Wrap>
        <div className="lnd-two-col">
          <motion.div {...fade()}>
            <Tag text="Веб-приложение" />
            <H2>
              Открыл в браузере —<br />
              <Em>закрепил как приложение</Em>
            </H2>
            <Sub>
              PWA: работает с телефона и десктопа, можно добавить на главный экран. Один аккаунт —
              роли атлет, тренер или обе с переключением кабинета.
            </Sub>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <Check text="Push-уведомления — не пропустить сообщение от тренера или атлета" />
              <Check text="Регистрация с выбором роли и вход по приглашению тренера по ссылке" />
            </div>
          </motion.div>
          <motion.div
            {...fade(0.1)}
            style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center' }}
          >
            <LandingPhoneMock
              h={440}
              w={200}
              icon="📲"
              caption="Добавить на экран"
              label="PWA"
              zIndex={2}
            />
            <LandingPhoneMock
              h={400}
              w={200}
              icon="🔔"
              caption="Web push"
              label="Уведомления"
              dim
              shrink={0.92}
              mt={36}
            />
          </motion.div>
        </div>
      </Wrap>

      <Rule />

      {/* ── CTA ── */}
      <Wrap pt={64} pb={96}>
        <motion.div {...fade()} className="lnd-cta-box">
          <div className="lnd-cta-glow" />
          <h2 className="lnd-cta-title">Хватит тренироваться вслепую</h2>
          <p className="lnd-cta-desc">
            Карта нагрузки, цифры и связь с тренером в одном месте — попробуй как атлет или подключи
            команду.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/register"
              className="lnd-btn-cta main-button"
              style={{
                borderRadius: 13,
                padding: '14px 32px',
                fontSize: 15,
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Начать бесплатно
            </Link>
            <Link
              to="/login"
              className="lnd-btn-ghost"
              style={{ padding: '14px 32px', fontSize: 15, fontWeight: 600 }}
            >
              Войти
            </Link>
          </div>
        </motion.div>
      </Wrap>

      {/* ── FOOTER ── */}
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
