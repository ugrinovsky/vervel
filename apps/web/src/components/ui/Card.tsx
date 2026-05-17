interface Props {
  className?: string;
  children: React.ReactNode;
}

/** Базовый класс карточки — используй для motion.div и других оберток */
export const cardClass = 'glass rounded-xl';
export const cardClass2xl = 'glass rounded-2xl';

export default function Card({ className = '', children }: Props) {
  return <div className={`${cardClass} ${className}`}>{children}</div>;
}
