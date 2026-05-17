import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { trainerApi, type AthletePass } from '@/api/trainer';
import AccentButton from '@/components/ui/AccentButton';
import GhostButton from '@/components/ui/GhostButton';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import CreatePassSheet from './CreatePassSheet';
import ConsumePassSheet from './ConsumePassSheet';
import { CreditCardIcon, EllipsisHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Props {
  athleteId: number;
}

type MenuState = 'none' | 'open';

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  active: { text: 'Активен', className: 'text-green-400' },
  depleted: { text: 'Исчерпан', className: 'text-amber-400' },
  expired: { text: 'Истёк', className: 'text-red-400' },
  cancelled: { text: 'Отменён', className: 'text-(--color_text_muted)' },
};

export default function PassBlock({ athleteId }: Props) {
  const [passes, setPasses] = useState<AthletePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showConsume, setShowConsume] = useState(false);
  const [menuPassId, setMenuPassId] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await trainerApi.listPasses(athleteId);
      setPasses(res.data.data);
    } catch (err) {
      console.error('[PassBlock] Failed to load passes', err);
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    load();
  }, [load]);

  const activePass = passes.find((p) => p.status === 'active') ?? null;
  const otherPasses = passes.filter((p) => p.status !== 'active');

  const handleCreated = (pass: AthletePass) => {
    setPasses((prev) => [pass, ...prev]);
  };

  const handleConsumed = (updated: AthletePass) => {
    setPasses((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleCancel = async (passId: number) => {
    setCancelling(passId);
    try {
      const res = await trainerApi.updatePass(passId, { status: 'cancelled' });
      setPasses((prev) => prev.map((p) => (p.id === passId ? res.data.data : p)));
      toast.success('Абонемент отменён');
    } catch (err: unknown) {
      toast.error(
        axios.isAxiosError(err)
          ? (err.response?.data?.message ?? 'Не удалось отменить')
          : 'Не удалось отменить'
      );
    } finally {
      setCancelling(null);
      setMenuPassId(null);
    }
  };

  if (loading) {
    return <div className="h-14 glass rounded-2xl animate-pulse" />;
  }

  return (
    <>
      <CreatePassSheet
        athleteId={athleteId}
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
      {activePass && (
        <ConsumePassSheet
          athleteId={athleteId}
          pass={activePass}
          open={showConsume}
          onClose={() => setShowConsume(false)}
          onConsumed={handleConsumed}
        />
      )}

      <div className="space-y-2">
        {/* Активный абонемент */}
        <AnimatePresence mode="popLayout">
          {activePass ? (
            <motion.div
              key={activePass.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="glass rounded-2xl overflow-hidden"
            >
              {/* Прогресс-бар */}
              <div className="h-1 bg-(--color_border)">
                <div
                  className="h-full bg-(--color_primary_light) transition-all duration-500"
                  style={{
                    width: `${Math.round((activePass.sessionsUsed / activePass.sessionsTotal) * 100)}%`,
                  }}
                />
              </div>

              <div className="px-4 py-3">
                {/* Заголовок */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CreditCardIcon className="w-4 h-4 text-(--color_primary_light) shrink-0" />
                    <span className="text-sm font-semibold text-white truncate">
                      {activePass.title}
                    </span>
                  </div>
                  <IconButton
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setMenuPassId(menuPassId === activePass.id ? null : activePass.id)
                    }
                    className="w-8 h-8 -m-1 shrink-0 bg-transparent"
                  >
                    {menuPassId === activePass.id ? (
                      <XMarkIcon className="w-4 h-4" />
                    ) : (
                      <EllipsisHorizontalIcon className="w-4 h-4" />
                    )}
                  </IconButton>
                </div>

                {/* Статистика */}
                <div className="flex items-center gap-3 mt-2 text-sm">
                  <span className="font-bold text-white text-base">
                    {activePass.sessionsLeft}
                    <span className="text-(--color_text_muted) font-normal text-xs">
                      {' '}
                      / {activePass.sessionsTotal} зан.
                    </span>
                  </span>
                  {activePass.validUntil && (
                    <span className="text-(--color_text_muted) text-xs">
                      до {format(parseISO(activePass.validUntil), 'd MMM', { locale: ru })}
                    </span>
                  )}
                  <span className="text-(--color_text_muted) text-xs ml-auto">
                    {Number(activePass.priceAmount).toLocaleString('ru-RU')} ₽
                  </span>
                </div>

                {/* Меню */}
                <AnimatePresence>
                  {menuPassId === activePass.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 flex gap-2">
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={cancelling === activePass.id}
                          onClick={() => handleCancel(activePass.id)}
                          className="flex-1 rounded-lg text-xs"
                        >
                          {cancelling === activePass.id ? 'Отменяем...' : 'Отменить абонемент'}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Кнопка списания */}
                <div className="mt-3">
                  <AccentButton size="sm" onClick={() => setShowConsume(true)} className="w-full">
                    Списать занятие
                  </AccentButton>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass rounded-2xl flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <CreditCardIcon className="w-4 h-4 text-(--color_text_muted) shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white">Абонемент</div>
                  <div className="text-xs text-(--color_text_muted)">
                    Учитывайте оплаченные занятия
                  </div>
                </div>
              </div>
              <GhostButton
                variant="outline-accent"
                onClick={() => setShowCreate(true)}
                className="shrink-0 border-(--color_primary_light)/40"
              >
                + Добавить
              </GhostButton>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Кнопка добавить (если уже есть активный) */}
        {activePass && (
          <Button
            type="button"
            variant="link"
            fullWidth
            onClick={() => setShowCreate(true)}
            className="py-2 text-xs text-center"
          >
            + Ещё абонемент
          </Button>
        )}

        {/* Архив прошлых абонементов */}
        {otherPasses.length > 0 && (
          <div className="space-y-1">
            {otherPasses.slice(0, 3).map((p) => {
              const statusCfg = STATUS_LABEL[p.status] ?? STATUS_LABEL.cancelled;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-(--color_bg_card)/50 border border-(--color_border)/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-(--color_text_muted) truncate">{p.title}</span>
                    <span className="text-xs font-medium shrink-0 opacity-70">
                      {p.sessionsUsed}/{p.sessionsTotal}
                    </span>
                  </div>
                  <span className={`text-[11px] font-medium shrink-0 ${statusCfg.className}`}>
                    {statusCfg.text}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
