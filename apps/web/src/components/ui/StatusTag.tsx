import type { ReactNode } from 'react';

export interface StatusTagProps {
  label: string;
  /** Tailwind classes for pill background and text */
  pillClassName: string;
  /** Tailwind classes for the status dot */
  dotClassName: string;
  className?: string;
  showDot?: boolean;
}

/** Компактный тег статуса: точка + подпись, слегка скруглённые углы. */
export default function StatusTag({
  label,
  pillClassName,
  dotClassName,
  className = '',
  showDot = true,
}: StatusTagProps) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded px-1 py-px text-[9px] font-medium leading-none ${pillClassName} ${className}`.trim()}
    >
      {showDot ? (
        <span className={`w-1 h-1 rounded-full shrink-0 ${dotClassName}`} aria-hidden />
      ) : null}
      {label}
    </span>
  );
}

/** Строка под тег — фиксированная высота, чтобы карточки в гриде не «прыгали». */
export function StatusTagRow({
  children,
  className = '',
  center = false,
}: {
  children?: ReactNode;
  className?: string;
  center?: boolean;
}) {
  return (
    <div
      className={`mt-0.5 min-h-[14px] flex items-center ${center ? 'justify-center' : ''} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
