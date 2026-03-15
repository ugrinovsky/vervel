import type { ReactNode } from 'react';

interface ScreenHintProps {
  emoji?: string;
  children: ReactNode;
  className?: string;
}

export default function ScreenHint({ emoji = '💡', children, className = '' }: ScreenHintProps) {
  return (
    <div className={`bg-(--color_bg_card) rounded-xl px-4 py-3 border border-(--color_border) flex items-start gap-3 ${className}`}>
      <span className="text-xl shrink-0">{emoji}</span>
      <div className="text-xs text-(--color_text_muted) leading-relaxed">{children}</div>
    </div>
  );
}
