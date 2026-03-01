import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const DOCS: Record<string, { title: string; content: React.ReactNode }> = {
  '/docs/privacy': {
    title: 'Политика конфиденциальности',
    content: (
      <>
        <p className="text-xs text-(--color_text_muted) mb-6">Последнее обновление: 1 марта 2026 г.</p>

        <Section title="1. Общие положения">
          <p>Настоящая Политика конфиденциальности (далее — «Политика») описывает, как Vervel (далее — «мы», «Сервис») собирает, использует и защищает персональные данные пользователей (далее — «Пользователь») при использовании мобильного и веб-приложения Vervel.</p>
          <p className="mt-2">Используя Сервис, вы соглашаетесь с условиями данной Политики. Если вы не согласны — пожалуйста, прекратите использование Сервиса.</p>
        </Section>

        <Section title="2. Какие данные мы собираем">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Регистрационные данные:</strong> имя, адрес электронной почты, пароль (в хэшированном виде).</li>
            <li><strong>Данные профиля:</strong> пол, фотография, специализации и образование (для тренеров).</li>
            <li><strong>Данные тренировок:</strong> упражнения, подходы, повторения, веса, дата и время тренировок.</li>
            <li><strong>Платёжные данные:</strong> сумма пополнения баланса, история транзакций. Данные банковских карт мы не храним — они обрабатываются платёжным сервисом ЮКасса.</li>
            <li><strong>Технические данные:</strong> IP-адрес, тип браузера и устройства, cookies.</li>
            <li><strong>Данные AI-запросов:</strong> текст сообщений в AI-чате (используется для обработки запросов).</li>
          </ul>
        </Section>

        <Section title="3. Как мы используем данные">
          <ul className="list-disc list-inside space-y-1">
            <li>Предоставление функций Сервиса: учёт тренировок, аналитика, чаты, AI-помощник.</li>
            <li>Персонализация: рекомендации, адаптация интерфейса.</li>
            <li>Обработка платежей и зачисление баланса.</li>
            <li>Обратная связь и поддержка пользователей.</li>
            <li>Улучшение качества Сервиса.</li>
          </ul>
        </Section>

        <Section title="4. Передача данных третьим лицам">
          <p>Мы не продаём и не передаём ваши персональные данные третьим лицам, за исключением:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>ЮКасса</strong> — платёжный сервис для обработки пополнений баланса.</li>
            <li><strong>Yandex Cloud (Алиса)</strong> — AI-платформа для обработки запросов в AI-чате.</li>
            <li>Случаев, предусмотренных законодательством РФ.</li>
          </ul>
        </Section>

        <Section title="5. Хранение и защита данных">
          <p>Данные хранятся на серверах, расположенных в Российской Федерации. Мы применяем технические и организационные меры для защиты данных от несанкционированного доступа: шифрование HTTPS, хэширование паролей, разграничение прав доступа.</p>
        </Section>

        <Section title="6. Права пользователя">
          <p>Вы вправе:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Получить доступ к своим персональным данным.</li>
            <li>Исправить неточные данные (через раздел «Настройки»).</li>
            <li>Удалить аккаунт и связанные данные — напишите на support@vervel.app.</li>
            <li>Отозвать согласие на обработку данных.</li>
          </ul>
        </Section>

        <Section title="7. Cookies">
          <p>Мы используем технические cookies, необходимые для авторизации и работы Сервиса. Аналитические и маркетинговые cookies не используются.</p>
        </Section>

        <Section title="8. Контакты">
          <p>По вопросам обработки персональных данных: <a href="mailto:support@vervel.app" className="text-(--color_primary_light)">support@vervel.app</a></p>
        </Section>
      </>
    ),
  },

  '/docs/offer': {
    title: 'Публичная оферта',
    content: (
      <>
        <p className="text-xs text-(--color_text_muted) mb-6">Последнее обновление: 1 марта 2026 г.</p>

        <Section title="1. Предмет оферты">
          <p>Настоящий документ является публичной офертой (предложением) Vervel (далее — «Исполнитель») о заключении договора на оказание информационных и сервисных услуг по доступу к веб-приложению Vervel (далее — «Сервис»).</p>
          <p className="mt-2">Акцептом (принятием) оферты считается регистрация в Сервисе или пополнение баланса кошелька.</p>
        </Section>

        <Section title="2. Описание услуг">
          <p>Сервис предоставляет:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Учёт тренировок: запись упражнений, подходов, весов, аналитика.</li>
            <li>AI-ассистент: помощь в составлении программ тренировок, питания и восстановления.</li>
            <li>AI-распознавание тренировок: преобразование описания в структурированную запись.</li>
            <li>Чаты тренера с атлетами и группами.</li>
            <li>Карта нагрузки мышц и периодизация.</li>
          </ul>
        </Section>

        <Section title="3. Стоимость и порядок оплаты">
          <p>Базовый доступ к Сервису бесплатен. Платные функции (AI-чат, AI-распознавание, AI-генерация тренировок) оплачиваются с внутреннего баланса кошелька.</p>
          <p className="mt-2"><strong>Тарифы:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>AI-чат — от 0.5₽ за сообщение (в зависимости от длины).</li>
            <li>Распознавание тренировки по фото — 9₽.</li>
            <li>Генерация тренировки AI (для тренеров) — 10₽.</li>
          </ul>
          <p className="mt-2">Пополнение баланса осуществляется через платёжный сервис ЮКасса. Минимальная сумма пополнения — 100₽.</p>
        </Section>

        <Section title="4. Возврат средств">
          <p>Пополненные средства возврату не подлежат, за исключением технических ошибок Сервиса. Для обращения по возврату: <a href="mailto:support@vervel.app" className="text-(--color_primary_light)">support@vervel.app</a></p>
        </Section>

        <Section title="5. Права и обязанности сторон">
          <p><strong>Исполнитель обязуется:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Обеспечивать доступность Сервиса 24/7 (за исключением плановых и аварийных технических работ).</li>
            <li>Хранить данные Пользователя в соответствии с Политикой конфиденциальности.</li>
          </ul>
          <p className="mt-2"><strong>Пользователь обязуется:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Не использовать Сервис в противоправных целях.</li>
            <li>Не передавать учётные данные третьим лицам.</li>
            <li>Предоставлять достоверную информацию при регистрации.</li>
          </ul>
        </Section>

        <Section title="6. Ограничение ответственности">
          <p>Сервис предоставляется «как есть». Рекомендации AI-ассистента носят информационный характер и не заменяют консультацию специалиста по физической подготовке или врача. Исполнитель не несёт ответственности за травмы и ущерб здоровью, связанные с выполнением рекомендаций Сервиса.</p>
        </Section>

        <Section title="7. Изменение условий">
          <p>Исполнитель вправе изменять условия оферты. Актуальная версия всегда доступна по адресу vervel.app/docs/offer. Продолжение использования Сервиса после изменений означает согласие с новыми условиями.</p>
        </Section>

        <Section title="8. Контакты">
          <p>По вопросам: <a href="mailto:support@vervel.app" className="text-(--color_primary_light)">support@vervel.app</a></p>
        </Section>
      </>
    ),
  },

  '/docs/seller': {
    title: 'Реквизиты продавца',
    content: (
      <>
        <p className="text-sm text-(--color_text_muted) mb-6">Информация о юридическом лице, осуществляющем деятельность через Сервис Vervel.</p>

        <Section title="Наименование">
          <p>Vervel (Верvel)</p>
          <p className="text-(--color_text_muted) text-sm mt-1">Форма деятельности: ИП / Самозанятый</p>
        </Section>

        <Section title="Контактные данные">
          <div className="space-y-2">
            <div>
              <span className="text-(--color_text_muted) text-sm">Email:</span>
              <a href="mailto:support@vervel.app" className="ml-2 text-(--color_primary_light)">support@vervel.app</a>
            </div>
            <div>
              <span className="text-(--color_text_muted) text-sm">Сайт:</span>
              <span className="ml-2 text-white">vervel.app</span>
            </div>
          </div>
        </Section>

        <Section title="Платёжная информация">
          <p>Приём платежей осуществляется через сервис <strong>ЮКасса</strong> (ООО НКО «ЮМани», лицензия ЦБ РФ).</p>
          <p className="mt-2 text-(--color_text_muted) text-sm">Данные вашей банковской карты не хранятся на наших серверах — они обрабатываются напрямую платёжной системой ЮКасса.</p>
        </Section>

        <Section title="Налоговый режим">
          <p className="text-(--color_text_muted) text-sm">Применяется специальный налоговый режим «Налог на профессиональный доход» (самозанятость) или упрощённая система налогообложения. Чек формируется автоматически через ЮКасса при каждом пополнении баланса.</p>
        </Section>

        <Section title="Применимое право">
          <p className="text-(--color_text_muted) text-sm">Деятельность осуществляется в соответствии с законодательством Российской Федерации, в том числе Федеральным законом № 152-ФЗ «О персональных данных» и Законом РФ «О защите прав потребителей».</p>
        </Section>

        <Section title="По всем вопросам">
          <p>Напишите нам: <a href="mailto:support@vervel.app" className="text-(--color_primary_light)">support@vervel.app</a></p>
          <p className="text-(--color_text_muted) text-sm mt-1">Мы отвечаем в течение 1–3 рабочих дней.</p>
        </Section>
      </>
    ),
  },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-semibold text-white mb-2">{title}</h2>
      <div className="text-sm text-(--color_text_muted) leading-relaxed">{children}</div>
    </div>
  );
}

export default function DocsScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const doc = DOCS[location.pathname];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (!doc) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color_bg)' }}>
        <div className="text-center">
          <p className="text-white text-lg font-semibold mb-2">Документ не найден</p>
          <button onClick={() => navigate(-1)} className="text-(--color_primary_light) text-sm">← Назад</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color_bg)' }}>
      <div className="p-4 w-full max-w-2xl mx-auto pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-(--color_bg_card) border border-(--color_border) text-white hover:bg-(--color_bg_card_hover) transition-colors shrink-0"
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-bold text-white">{doc.title}</h1>
        </div>

        {/* Content */}
        <div className="bg-(--color_bg_card) rounded-2xl p-6 border border-(--color_border)">
          {doc.content}
        </div>

        <p className="text-xs text-(--color_text_muted) text-center mt-6">
          Vervel · support@vervel.app
        </p>
      </div>
    </div>
  );
}
