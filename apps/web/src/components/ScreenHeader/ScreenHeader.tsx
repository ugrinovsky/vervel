import React from 'react';

interface ScreenHeaderProps {
  /** Эмодзи или иконка */
  icon?: string | React.ReactNode;
  /** Основной заголовок */
  title: string;
  /** Описание под заголовком */
  description?: string;
  /** Дополнительный контент справа (кнопки, фильтры и т.д.) */
  actions?: React.ReactNode;
  /** Дополнительный класс для кастомизации */
  className?: string;
}

export default function ScreenHeader({
  icon,
  title,
  description,
  actions,
  className = '',
}: ScreenHeaderProps) {
  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            {icon && (
              <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--color_primary_light)]/20 to-[var(--color_primary)]/20 border border-[var(--color_border)]">
                {typeof icon === 'string' ? (
                  <span className="text-2xl">{icon}</span>
                ) : (
                  icon
                )}
              </span>
            )}
            <span className="bg-gradient-to-r from-white to-[var(--color_text_secondary)] bg-clip-text text-transparent">
              {title}
            </span>
          </h1>

          {description && (
            <p className="text-[var(--color_text_muted)] text-sm md:text-base ml-[60px]">
              {description}
            </p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Decorative line */}
      <div className="mt-4 h-[2px] bg-gradient-to-r from-[var(--color_primary_light)]/50 via-[var(--color_primary)]/30 to-transparent rounded-full" />
    </div>
  );
}
