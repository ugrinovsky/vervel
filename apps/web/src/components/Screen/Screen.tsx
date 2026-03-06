import { PropsWithChildren } from 'react';
import './styles.css';

interface ScreenProps {
  /** Показать спиннер вместо дочерних элементов */
  loading?: boolean;
  className?: string;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] w-full">
      <div className="w-8 h-8 border-2 border-white/20 border-t-(--color_primary_light) rounded-full animate-spin" />
    </div>
  );
}

export default function Screen({ children, loading, className = '' }: PropsWithChildren<ScreenProps>) {
  return (
    <div className={`screen flex flex-col md:flex-row items-stretch h-full ${className}`.trim()}>
      {loading ? <PageLoader /> : children}
    </div>
  );
}
