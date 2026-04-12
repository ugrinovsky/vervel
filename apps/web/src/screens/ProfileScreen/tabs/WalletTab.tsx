import { useState, useCallback, useEffect } from 'react';
import AnimatedBlock from '@/components/ui/AnimatedBlock';
import toast from 'react-hot-toast';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { aiApi } from '@/api/ai';
import type { AiBalance } from '@/api/ai';
import { paymentsApi } from '@/api/payments';
import { useServerPagination } from '@/hooks/useServerPagination';
import AiChat from '@/components/AiChat/AiChat';
import AccentButton from '@/components/ui/AccentButton';
import ListButton from '@/components/ui/ListButton';
import ToggleGroup from '@/components/ui/ToggleGroup';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const TOP_UP_AMOUNTS = [100, 250, 500, 1000];

interface Props {
  balance: number | null;
  inTrainerMode: boolean;
}

export default function WalletTab({ balance, inTrainerMode }: Props) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [topping, setTopping] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);

  const txFetcher = useCallback(
    (offset: number, limit: number) =>
      aiApi.getTransactions(offset, limit).then((r) => r.data.data),
    []
  );
  const {
    items: transactions,
    loading: txLoading,
    hasMore: txHasMore,
    initialize: txInit,
    loadMore: txLoadMore,
  } = useServerPagination<AiBalance['transactions'][number]>(txFetcher, { limit: 20 });

  useEffect(() => {
    txInit();
  }, []);

  const handleTopup = async () => {
    if (!selectedAmount) return;
    setTopping(true);
    try {
      const res = await paymentsApi.topup(selectedAmount);
      window.location.href = res.data.confirmationUrl;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 503) {
        toast.error('Пополнение пока недоступно — сайт не подключён к платёжной системе.');
      } else {
        toast.error('Ошибка создания платежа. Попробуйте позже.');
      }
    } finally {
      setTopping(false);
    }
  };

  return (
    <AnimatedBlock
      key="wallet"
      className="space-y-4"
    >
      <AiChat open={aiChatOpen} onClose={() => setAiChatOpen(false)} />

      {/* Balance card */}
      <div className="bg-(--color_bg_card) rounded-2xl p-6 border border-(--color_border)">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Кошелек</h2>
            <p className="text-xs text-(--color_text_muted) mt-0.5">ИИ-функции, донаты тренерам</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {balance !== null ? `${balance}₽` : '—'}
            </div>
            <div className="text-xs text-(--color_text_muted)">баланс</div>
          </div>
        </div>

        {/* AI costs hint */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            ...(inTrainerMode ? [{ label: 'Генерация', cost: '10₽' }] : []),
            { label: 'Распознавание', cost: '10₽' },
            { label: 'ИИ-чат', cost: 'от 0.5₽' },
          ].map(({ label, cost }) => (
            <div
              key={label}
              className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-(--color_text_muted)"
            >
              {label} — <span className="text-white/70">{cost}</span>
            </div>
          ))}
        </div>

        {/* Top-up */}
        <ToggleGroup
          cols={4}
          value={selectedAmount}
          onChange={setSelectedAmount}
          options={TOP_UP_AMOUNTS.map((amount) => ({ value: amount, label: `${amount}₽` }))}
          className="mb-3"
        />
        <AccentButton
          onClick={handleTopup}
          disabled={!selectedAmount || topping}
          className="disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {topping
            ? 'Переход к оплате…'
            : selectedAmount
              ? `Пополнить на ${selectedAmount}₽`
              : 'Выберите сумму'}
        </AccentButton>
      </div>

      {/* AI Chat button */}
      <ListButton onClick={() => setAiChatOpen(true)} className="gap-3 p-4">
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500/20 shrink-0">
          <SparklesIcon className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white">ИИ-помощник</div>
          <p className="text-xs text-(--color_text_muted) mt-0.5">
            Тренировки, питание, восстановление — от 0.5₽/сообщение
          </p>
        </div>
        <span className="text-(--color_text_muted) text-sm">→</span>
      </ListButton>

      {/* Transaction history */}
      <div className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border)">
          <p className="text-sm font-semibold text-white mb-3">История операций</p>
          {txLoading && transactions.length === 0 ? (
            <div className="flex justify-center py-2">
              <LoadingSpinner size="xs" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-xs text-(--color_text_muted) text-center py-2">Операций пока не было</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => {
                const isIncome = tx.amount > 0;
                const typeMap: Record<string, string> = {
                  topup: '💳',
                  chat: '🤖',
                  generate: '✨',
                  recognize: '📷',
                };
                const emoji = typeMap[tx.type] ?? '💰';
                return (
                  <div key={tx.id} className="flex items-center gap-2">
                    <span className="text-base shrink-0">{emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white truncate">{tx.description}</div>
                      <div className="text-xs text-(--color_text_muted)">
                        {new Date(tx.createdAt).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-semibold shrink-0 ${isIncome ? 'text-emerald-400' : 'text-(--color_text_muted)'}`}
                    >
                      {isIncome ? '+' : ''}
                      {tx.amount}₽
                    </div>
                  </div>
                );
              })}
              {txHasMore && (
                <button
                  onClick={() => txLoadMore()}
                  disabled={txLoading}
                  className="w-full text-xs text-(--color_text_muted) hover:text-white py-1 transition-colors disabled:opacity-50"
                >
                  {txLoading ? 'Загрузка…' : 'Загрузить ещё'}
                </button>
              )}
            </div>
          )}
      </div>
    </AnimatedBlock>
  );
}
