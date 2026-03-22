interface BadgeProps {
  count: number;
  max?: number;
  /** xs: h-4 (nav dots), sm: h-5 (default), md: h-6 (lists) */
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const SIZE = {
  xs: 'min-w-4 h-4 px-0.5 text-[10px] leading-none',
  sm: 'min-w-5 h-5 px-1 text-xs leading-none',
  md: 'min-w-6 h-6 px-1.5 text-xs',
};

export default function Badge({ count, max = 99, size = 'sm', className = '' }: BadgeProps) {
  return (
    <span
      style={{ color: 'white' }}
      className={`rounded-full bg-red-500 font-bold flex items-center justify-center shrink-0 ${SIZE[size]} ${className}`}
    >
      {count > max ? `${max}+` : count}
    </span>
  );
}
