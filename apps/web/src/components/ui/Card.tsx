interface Props {
  className?: string;
  children: React.ReactNode;
}

/** Базовый класс карточки — используй для motion.div и других оберток */
export const cardClass = 'bg-(--color_bg_card) rounded-xl border border-(--color_border)';

export default function Card({ className = '', children }: Props) {
  return (
    <div className={`${cardClass} ${className}`}>
      {children}
    </div>
  );
}
