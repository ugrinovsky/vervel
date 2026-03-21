import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import QrScanner from '@/components/QrScanner/QrScanner';
import { trainerApi } from '@/api/trainer';
import AccentButton from '@/components/ui/AccentButton';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

type Tab = 'email' | 'invite' | 'qr';

function QrScanTab({ active, onAdded }: { active: boolean; onAdded: () => void }) {
  const [state, setState] = useState<'scanning' | 'loading' | 'success' | 'error'>('scanning');
  const [errorMsg, setErrorMsg] = useState('');

  const handleScan = async (raw: string) => {
    setState('loading');
    try {
      const parsed = JSON.parse(raw) as { athleteId?: number };
      if (!parsed.athleteId) throw new Error('invalid qr');
      await trainerApi.addByQr(parsed.athleteId);
      setState('success');
      toast.success('Атлет добавлен');
      setTimeout(onAdded, 800);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Не удалось добавить атлета. Попробуйте снова.';
      setErrorMsg(msg);
      setState('error');
    }
  };

  const reset = () => setState('scanning');

  if (state === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3 py-10"
      >
        <div className="w-14 h-14 rounded-full bg-(--color_primary_light) flex items-center justify-center text-2xl text-white">
          ✓
        </div>
        <p className="text-sm text-white font-medium">Атлет добавлен</p>
      </motion.div>
    );
  }

  if (state === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4 py-6"
      >
        <p className="text-sm text-red-400 text-center">{errorMsg}</p>
        <AccentButton size="sm" onClick={reset} className="px-6 py-2.5 rounded-xl">
          Попробовать снова
        </AccentButton>
      </motion.div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center gap-3 py-10">
        <div className="w-8 h-8 border-2 border-(--color_primary_light) border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-(--color_text_muted)">Добавляем атлета...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <QrScanner active={active} onScan={handleScan} />
      <p className="text-xs text-center text-(--color_text_muted)">
        Наведите камеру на QR-код из профиля атлета
      </p>
    </motion.div>
  );
}

export default function AddAthleteDrawer({ open, onClose, onAdded }: Props) {
  const [tab, setTab] = useState<Tab>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const handleAddByEmail = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await trainerApi.addByEmail(email.trim());
      toast.success('Атлет добавлен');
      setEmail('');
      onAdded();
      onClose();
    } catch {
      toast.error('Не удалось добавить атлета');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvite = async () => {
    setLoading(true);
    try {
      const res = await trainerApi.generateInvite();
      const fullLink = `${window.location.origin}/invite/${res.data.data.token}`;
      setInviteLink(fullLink);
    } catch {
      toast.error('Ошибка генерации ссылки');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success('Ссылка скопирована');
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'email', label: 'По email' },
    { key: 'invite', label: 'Ссылка' },
    { key: 'qr', label: 'QR-код' },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title="Добавить атлета" emoji="➕">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-(--color_primary_light) text-white'
                  : 'bg-(--color_bg_card_hover) text-(--color_text_muted) hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Email tab */}
        {tab === 'email' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleAddByEmail()}
            />
            <AccentButton
              onClick={handleAddByEmail}
              disabled={loading || !email.trim()}
              loading={loading}
              loadingText="Добавляем..."
            >
              Добавить
            </AccentButton>
          </motion.div>
        )}

        {/* Invite link tab */}
        {tab === 'invite' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {!inviteLink ? (
              <button
                onClick={handleGenerateInvite}
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-medium bg-(--color_primary_light) text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Генерируем...' : 'Сгенерировать ссылку'}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-(--color_bg_input) border border-(--color_border) rounded-xl px-4 py-3 text-sm text-white break-all">
                  {inviteLink}
                </div>
                <button
                  onClick={handleCopyLink}
                  className="w-full py-3 rounded-xl text-sm font-medium bg-(--color_bg_card_hover) text-white hover:opacity-90 transition-opacity"
                >
                  Скопировать
                </button>
                <button
                  onClick={() => setInviteLink(null)}
                  className="w-full py-2 text-sm text-(--color_text_muted) hover:text-white transition-colors"
                >
                  Создать новую
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* QR tab */}
        {tab === 'qr' && (
          <QrScanTab
            active={tab === 'qr' && open}
            onAdded={() => {
              onAdded();
              onClose();
            }}
          />
        )}
      </div>
    </BottomSheet>
  );
}
