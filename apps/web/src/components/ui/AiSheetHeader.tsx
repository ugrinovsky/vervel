import type { ReactNode } from 'react';

type Props = {
  icon: ReactNode;
  title: string;
  balance: number | null;
  hasEnoughBalance?: boolean;
};

export default function AiSheetHeader({ icon, title, balance, hasEnoughBalance = true }: Props) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500/20">
        {icon}
      </div>
      <span className="text-lg font-bold text-white">{title}</span>
      {balance !== null && (
        <span
          className={`ml-1 text-xs px-2 py-0.5 rounded-full ${
            hasEnoughBalance ? 'bg-white/10 text-white/50' : 'bg-red-500/20 text-red-400'
          }`}
        >
          баланс: {balance}₽
        </span>
      )}
    </div>
  );
}

