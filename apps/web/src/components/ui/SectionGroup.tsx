import type { ReactNode } from 'react';
import SectionBreak from '@/components/ui/SectionBreak';

export interface SectionGroupProps {
  /** Заголовок секции (строка или узел). Не рендерится при `showLabel={false}`. */
  title?: ReactNode;
  /** Подзаголовок под группой — мелкий текст без uppercase */
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Доп. классы для `<h2>` */
  titleClassName?: string;
  /** Классы контейнера содержимого (по умолчанию вертикальный стек `space-y-3`) */
  bodyClassName?: string;
  /**
   * Разделитель под контентом группы (перед следующей группой).
   * У последней группы на экране передайте false.
   */
  showBreakAfter?: boolean;
  /** Вид разделителя */
  breakVariant?: 'dots' | 'line';
  /**
   * Показывать подпись-группу (uppercase) над контентом.
   * false — только разделитель (если включён) и контент: для блока под основным ScreenHeader, без дубля «Обзор» и т.п.
   */
  showLabel?: boolean;
}

/**
 * Секция экрана с подписью-группой (uppercase) и блоком контента.
 * Для настроек, форм длинного скролла и т.п.
 */
export default function SectionGroup({
  title,
  description,
  children,
  className = '',
  titleClassName = '',
  bodyClassName = 'space-y-3',
  showBreakAfter = true,
  breakVariant = 'dots',
  showLabel = true,
}: SectionGroupProps) {
  const hasTitle = title != null && title !== '';
  const hasDescription = description != null && description !== '';

  const spacingAfter = showBreakAfter ? 'mb-4' : 'mb-6';

  return (
    <section className={`flex flex-col gap-3 ${spacingAfter} ${className}`.trim()}>
      {showLabel && (hasTitle || hasDescription) && (
        <header className="space-y-1 px-0.5">
          {hasTitle && (
            <h2
              className={`text-[11px] font-semibold text-(--color_text_muted) uppercase tracking-wider ${titleClassName}`.trim()}
            >
              {title}
            </h2>
          )}
          {hasDescription && (
            <p className="text-xs text-(--color_text_muted) leading-relaxed">{description}</p>
          )}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
      {showBreakAfter && <SectionBreak variant={breakVariant} />}
    </section>
  );
}
