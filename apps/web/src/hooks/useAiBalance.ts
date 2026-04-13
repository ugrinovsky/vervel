import { useBalance } from '@/contexts/AuthContext';

export function useAiBalance(cost: number) {
  const { balance, setBalance } = useBalance();
  /** Не даём списать, пока баланс неизвестен (иначе ловим дублирующие ошибки в UI). */
  const hasEnoughBalance = balance !== null && balance >= cost;
  return { balance, setBalance, hasEnoughBalance };
}
