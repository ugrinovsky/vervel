import { useBalance } from '@/contexts/AuthContext';

export function useAiBalance(cost: number) {
  const { balance, setBalance } = useBalance();
  const hasEnoughBalance = balance === null || balance >= cost;
  return { balance, setBalance, hasEnoughBalance };
}
