import type { HTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react';
import { fieldLabelClass, type FieldLabelVariant } from '@/components/ui/fieldLabelStyles';

type FieldLabelProps = {
  variant?: FieldLabelVariant;
  children: ReactNode;
  as?: 'p' | 'label';
  className?: string;
} & (Omit<HTMLAttributes<HTMLParagraphElement>, 'children'> &
  Omit<LabelHTMLAttributes<HTMLLabelElement>, 'children'>);

export default function FieldLabel({
  variant = 'field',
  as: Tag = 'label',
  className = '',
  children,
  ...props
}: FieldLabelProps) {
  return (
    <Tag className={fieldLabelClass(variant, className)} {...props}>
      {children}
    </Tag>
  );
}
