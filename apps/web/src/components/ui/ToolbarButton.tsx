import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Button from '@/components/ui/Button';
import { toolbarIconClasses } from '@/components/ui/buttonStyles';

interface ToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tone?: 'default' | 'info' | 'danger';
  title?: string;
}

/** Compact icon action in dense forms (duplicate set, delete row, etc.). */
export default function ToolbarButton({
  children,
  tone = 'default',
  className = '',
  type = 'button',
  ...props
}: ToolbarButtonProps) {
  return (
    <Button
      type={type}
      variant="unstyled"
      className={`${toolbarIconClasses(tone)} ${className}`}
      {...props}
    >
      {children}
    </Button>
  );
}
