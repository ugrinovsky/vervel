import FieldLabel from '@/components/ui/FieldLabel';

interface Props {
  label: React.ReactNode;
  children: React.ReactNode;
}

export default function FormField({ label, children }: Props) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}
