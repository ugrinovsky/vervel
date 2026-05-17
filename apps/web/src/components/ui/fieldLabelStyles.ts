export type FieldLabelVariant = 'field' | 'section';

const VARIANT_CLASS: Record<FieldLabelVariant, string> = {
  field: 'text-xs text-(--color_text_muted) mb-2 block',
  section:
    'text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2 block',
};

export function fieldLabelClass(variant: FieldLabelVariant = 'field', className = ''): string {
  return [VARIANT_CLASS[variant], className].filter(Boolean).join(' ').trim();
}
