type Props = {
  cost: number;
  actionLabel: string;
};

export default function AiCostNotice({ cost, actionLabel }: Props) {
  return (
    <p className="text-xs text-white/45 leading-relaxed rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="text-white/70">{cost}₽</span> — списываются с баланса сразу при запуске «{actionLabel}» (до
      ответа ИИ). При сбое сервиса возврат не выполняется автоматически.
    </p>
  );
}

