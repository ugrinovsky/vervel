import type { ReactNode } from 'react';

type SectionCardProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

/**
 * Карточка с заголовком секции и строками внутри одной рамки.
 * Подходит для настроек, списков опций, форм — не только «экран настроек».
 */
export function SectionCard({ title, children, className = '' }: SectionCardProps) {
  return (
    <div
      className={`bg-(--color_bg_card) rounded-2xl border border-(--color_border) overflow-hidden mb-2 ${className}`.trim()}
    >
      <p className="text-[11px] font-semibold text-(--color_text_muted) uppercase tracking-wider px-4 pt-3 pb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

type SectionCardRowProps = {
  label: ReactNode;
  /** Вторая строка: подсказка, предупреждение о зависимости и т.п. */
  description?: ReactNode;
  /** Визуально приглушить строку */
  dimmed?: boolean;
  /** Нижняя разделитель; у последней строки в карточке — false */
  showDivider?: boolean;
  /** Справа: переключатель, стрелка, значение и т.д. */
  trailing: ReactNode;
};

/** Строка внутри {@link SectionCard}: подпись слева, действие справа. */
export function SectionCardRow({
  label,
  description,
  dimmed = false,
  showDivider = true,
  trailing,
}: SectionCardRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3 ${
        showDivider ? 'border-b border-(--color_border)' : ''
      } ${dimmed ? 'opacity-40' : ''}`.trim()}
    >
      <div className="min-w-0">
        <div className="text-sm text-white leading-snug">{label}</div>
        {description ? (
          <div className="text-[11px] text-(--color_text_muted) mt-0.5 leading-snug">{description}</div>
        ) : null}
      </div>
      {trailing}
    </div>
  );
}
