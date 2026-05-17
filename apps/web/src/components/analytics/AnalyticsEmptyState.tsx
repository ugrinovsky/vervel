import { AnalyticsSheetIntro } from './AnalyticsSheetIntro';

interface Props {
  /** Текст в синем info-блоке (AnalyticsSheetIntro). Если не передан — блок не рендерится. */
  hint?: string;
  /** Основной текст заглушки */
  message?: string;
  /** CSS-классы для контейнера (например h-40 для графиков) */
  className?: string;
}

/** Единая заглушка для аналитических блоков, когда данных недостаточно */
export function AnalyticsEmptyState({
  hint,
  message = 'Пока недостаточно данных',
  className,
}: Props) {
  if (hint) {
    return (
      <div className={`space-y-4${className ? ` ${className}` : ''}`}>
        <AnalyticsSheetIntro>{hint}</AnalyticsSheetIntro>
        <p className="text-sm text-(--color_text_muted) text-center py-6">{message}</p>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center text-sm text-(--color_text_muted)${className ? ` ${className}` : ''}`}
    >
      {message}
    </div>
  );
}
