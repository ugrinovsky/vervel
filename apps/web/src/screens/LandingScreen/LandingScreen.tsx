import { Navigate, Link } from 'react-router';
import { motion } from 'framer-motion';
import VerveLogo from '@/components/VerveLogo/VerveLogo';
import { useAuth } from '@/contexts/AuthContext';
import AvatarScreen from './assets/AvatarScreen.png';
import './LandingScreen.css';

// ── iPhone placeholder ────────────────────────────────────────────────────────

function Phone({
  h = 460, w = 210,
  icon, caption, label, src,
  dim = false, shrink = 1, mt = 0, zIndex = 1,
}: {
  h?: number; w?: number;
  icon?: string; caption?: string; label?: string; src?: string;
  dim?: boolean; shrink?: number; mt?: number; zIndex?: number;
}) {
  if (src) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <img
          src={src} alt={label}
          style={{
            height: h,
            opacity: dim ? 0.5 : 1,
            transform: `scale(${shrink})`,
            transformOrigin: 'bottom center',
            marginTop: mt,
            zIndex,
          }}
        />
        {label && <span className="lnd-phone-label">{label}</span>}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div
        className="lnd-phone"
        style={{
          width: w, height: h,
          borderRadius: Math.round(40 * (w / 210)),
          opacity: dim ? 0.5 : 1,
          transform: `scale(${shrink})`,
          transformOrigin: 'bottom center',
          marginTop: mt,
          zIndex,
        }}
      >
        {/* Dynamic island */}
        <div style={{
          position: 'absolute', top: 13, left: '50%', transform: 'translateX(-50%)',
          width: Math.round(w * 0.42), height: Math.round(h * 0.052),
          background: 'rgba(0,0,0,0.9)', borderRadius: 18, zIndex: 2,
        }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          {icon && <div className="lnd-phone-icon">{icon}</div>}
          {caption && <span className="lnd-phone-caption">{caption}</span>}
        </div>
      </div>
      {label && <span className="lnd-phone-label">{label}</span>}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Wrap({ children, pt = 72, pb = 72 }: { children: React.ReactNode; pt?: number; pb?: number }) {
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
      <span className="lnd-check-icon">✓</span>{text}
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
            <Link to="/login" className="lnd-btn-ghost">Войти</Link>
            <Link to="/register" className="lnd-btn-primary main-button" style={{ borderRadius: 10, padding: '9px 18px', fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
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
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="lnd-h1"
            >
              Ты тренируешься усердно.{' '}
              <Em>Но растёшь ли ты?</Em>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12 }}
              className="lnd-hero-desc"
            >
              Vervel объединяет атлетов и тренеров на одной платформе. Планы, аналитика, чат и ИИ — без блокнотов и хаоса в мессенджерах.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.22 }}
              style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}
            >
              <Link to="/register" className="lnd-btn-cta main-button" style={{ borderRadius: 13, padding: '14px 28px', fontSize: 15, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
                Начать бесплатно
              </Link>
              <Link to="/login" className="lnd-btn-ghost" style={{ padding: '14px 28px', fontSize: 15, fontWeight: 600 }}>
                Уже есть аккаунт →
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }}
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', position: 'relative' }}
          >
            <div className="lnd-hero-glow" />
            <Phone h={490} w={220} icon="🏠" caption="Главный экран" zIndex={2} />
            <Phone h={490} w={220} icon="📊" caption="Аналитика" dim shrink={0.88} mt={56} />
          </motion.div>
        </div>
      </Wrap>

      <Rule />

      {/* ── ATHLETE SCREENS ── */}
      <Wrap>
        <motion.div {...fade()} style={{ marginBottom: 44 }}>
          <Tag text="Для атлета" />
          <H2>Все инструменты —<br /><Em>в одном приложении</Em></H2>
          <Sub>От плана и дневника до аналитики нагрузок и связи с тренером.</Sub>
        </motion.div>

        <div className="lnd-two-col">
          <motion.div {...fade(0.05)} style={{ display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'flex-end' }}>
            <Phone h={450} w={196} icon="📅" caption="Календарь тренировок" label="Календарь" />
            <Phone h={490} w={196} icon="📊" caption="Аналитика нагрузок" label="Аналитика" zIndex={2} />
          </motion.div>
          <motion.div {...fade(0.1)}>
            <FeatureRow items={[
              { icon: '📅', title: 'Календарь', desc: 'Все тренировки — запланированные и выполненные. Нагрузка за любой период.' },
              { icon: '📊', title: 'Аналитика', desc: 'Графики нагрузок, мышечный баланс, стрики, сравнение с прошлыми циклами.' },
              { icon: '👥', title: 'Моя команда', desc: 'Связь с тренером внутри приложения — план, комментарии, история.' },
              { icon: '🏆', title: 'Достижения', desc: 'Стрики и ачивки, которые мотивируют не пропускать тренировки.' },
            ]} />
          </motion.div>
        </div>

        <motion.div {...fade(0.15)} className="lnd-phones-row" style={{ marginTop: 36 }}>
          <Phone h={420} w={188} src={AvatarScreen} label="Профиль" />
          <Phone h={460} w={188} icon="💪" caption="Добавить тренировку" label="Тренировка" />
          <Phone h={420} w={188} icon="🤖" caption="AI-чат" label="ИИ-тренер" />
          <Phone h={420} w={188} icon="🏆" caption="Достижения" label="Ачивки" />
        </motion.div>
      </Wrap>

      <Rule />

      {/* ── TRAINER SCREENS ── */}
      <Wrap>
        <motion.div {...fade()} style={{ marginBottom: 44 }}>
          <Tag text="Для тренера" />
          <H2>Управляй командой<br /><Em>без лишних инструментов</Em></H2>
          <Sub>Все атлеты, расписание, шаблоны и коммуникация — в одном дашборде.</Sub>
        </motion.div>

        <div className="lnd-two-col">
          <motion.div {...fade(0.05)}>
            <FeatureRow items={[
              { icon: '⏰', title: 'Сегодня', desc: 'Кто тренируется сейчас. Быстрый доступ к расписанию дня.' },
              { icon: '👤', title: 'Мои атлеты', desc: 'Карточка каждого атлета с историей, прогрессом и непрочитанными сообщениями.' },
              { icon: '👥', title: 'Группы', desc: 'Назначай тренировки сразу всей группе — без дублирования.' },
              { icon: '📋', title: 'Шаблоны', desc: 'Библиотека готовых планов. Назначай атлету за секунды.' },
              { icon: '📚', title: 'База упражнений', desc: 'Собственная библиотека с мышцами и техникой выполнения.' },
            ]} />
          </motion.div>
          <motion.div {...fade(0.1)} style={{ display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'flex-end' }}>
            <Phone h={490} w={196} icon="⏰" caption="Расписание на сегодня" label="Сегодня" zIndex={2} />
            <Phone h={450} w={196} icon="👤" caption="Список атлетов" label="Атлеты" />
          </motion.div>
        </div>

        <motion.div {...fade(0.15)} className="lnd-phones-row" style={{ marginTop: 36 }}>
          <Phone h={420} w={188} icon="👥" caption="Группы атлетов" label="Группы" />
          <Phone h={460} w={188} icon="📋" caption="Шаблоны тренировок" label="Шаблоны" />
          <Phone h={420} w={188} icon="📅" caption="Расписание тренера" label="Расписание" />
          <Phone h={420} w={188} icon="📚" caption="База упражнений" label="Упражнения" />
        </motion.div>
      </Wrap>

      <Rule />

      {/* ── AI ── */}
      <Wrap>
        <div className="lnd-two-col">
          <motion.div {...fade()}>
            <Tag text="ИИ-технологии" />
            <H2>Тренер,{' '}<Em>который не спит</Em></H2>
            <Sub>ИИ знает историю нагрузок и помогает принимать конкретные решения.</Sub>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <Check text="Генерирует тренировочный план за секунды по твоей цели и уровню" />
              <Check text="Читает программы из фотографий — добавляет упражнения в план автоматически" />
              <Check text="Отвечает на вопросы о технике, питании и восстановлении 24/7" />
              <Check text="Тренерам: создаёт шаблоны тренировок по одному запросу" />
            </div>
          </motion.div>
          <motion.div {...fade(0.1)} style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'flex-end' }}>
            <Phone h={400} w={190} icon="📷" caption="Фото → план" label="Распознавание" dim shrink={0.9} mt={40} />
            <Phone h={460} w={190} icon="🤖" caption="AI-чат" label="ИИ-тренер" zIndex={2} />
          </motion.div>
        </div>
      </Wrap>

      <Rule />

      {/* ── CTA ── */}
      <Wrap pt={64} pb={96}>
        <motion.div {...fade()} className="lnd-cta-box">
          <div className="lnd-cta-glow" />
          <h2 className="lnd-cta-title">Хватит тренироваться вслепую</h2>
          <p className="lnd-cta-desc">Начни системно расти уже сегодня — как атлет или как тренер.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="lnd-btn-cta main-button" style={{ borderRadius: 13, padding: '14px 32px', fontSize: 15, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
              Начать бесплатно
            </Link>
            <Link to="/login" className="lnd-btn-ghost" style={{ padding: '14px 32px', fontSize: 15, fontWeight: 600 }}>
              Войти
            </Link>
          </div>
        </motion.div>
      </Wrap>

      {/* ── FOOTER ── */}
      <footer className="lnd-footer">
        <div className="lnd-footer-inner">
          <VerveLogo className="h-7 w-auto" />
          <span className="lnd-footer-copy">© 2025 Vervel</span>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Политика конфиденциальности', 'Условия'].map((l) => (
              <a key={l} href="#" className="lnd-footer-link">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
