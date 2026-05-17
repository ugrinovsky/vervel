import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { fieldControlClasses, TEXTAREA_FIELD_PADDING } from '@/components/ui/inputStyles';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  /** Только нативный textarea — для чата и кастомных flex-обёрток. */
  bare?: boolean;
}

/**
 * Unified multiline field — prefer this over raw `<textarea>` with inline Tailwind.
 */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, bare = false, className = '', style, ...props },
  ref,
) {
  const control = (
    <textarea
      ref={ref}
      {...props}
      className={
        bare
          ? [error ? 'border-red-500/60' : '', className].filter(Boolean).join(' ').trim()
          : fieldControlClasses({ error, className: `${TEXTAREA_FIELD_PADDING} ${className}` })
      }
      style={{ outline: 'none', ...style }}
    />
  );

  if (bare) {
    return (
      <>
        {control}
        {error ? <p className="text-xs text-red-400 mt-1">{error}</p> : null}
      </>
    );
  }

  return (
    <div className="w-full">
      {label ? <label className="block text-xs text-(--color_text_muted) mb-1">{label}</label> : null}
      {control}
      {error ? <p className="text-xs text-red-400 mt-1">{error}</p> : null}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;
