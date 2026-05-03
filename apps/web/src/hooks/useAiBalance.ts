import { useBalance } from '@/contexts/AuthContext';

export function useAiBalance(cost: number) {
  const { balance, setBalance } = useBalance();
  /**
   * Блокируем только если баланс уже известен и меньше стоимости.
   * При balance === null кнопки остаются активными — списание проверит API; иначе при «висящем»
   * балансе из профиля форма выглядела бы сломанной (текст есть — клик нельзя).
   */
  const hasEnoughBalance = balance === null || balance >= cost;
  return { balance, setBalance, hasEnoughBalance };
}
