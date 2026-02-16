import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Drawer from '@/components/Drawer';
import { trainerApi } from '@/api/trainer';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

type Tab = 'email' | 'invite' | 'qr';

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
    <Drawer
      open={open}
      onClose={onClose}
      header={<span className="text-lg font-semibold text-white">Добавить атлета</span>}
    >
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-[var(--color_primary_light)] text-white'
                  : 'bg-[var(--color_bg_card)] text-[var(--color_text_muted)] hover:text-white'
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
              className="w-full bg-[var(--color_bg_input)] border border-[var(--color_border)] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--color_primary_light)] transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleAddByEmail()}
            />
            <button
              onClick={handleAddByEmail}
              disabled={loading || !email.trim()}
              className="w-full py-3 rounded-xl text-sm font-medium bg-[var(--color_primary_light)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Добавляем...' : 'Добавить'}
            </button>
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
                className="w-full py-3 rounded-xl text-sm font-medium bg-[var(--color_primary_light)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Генерируем...' : 'Сгенерировать ссылку'}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-[var(--color_bg_input)] border border-[var(--color_border)] rounded-xl px-4 py-3 text-sm text-white break-all">
                  {inviteLink}
                </div>
                <button
                  onClick={handleCopyLink}
                  className="w-full py-3 rounded-xl text-sm font-medium bg-[var(--color_bg_card_hover)] text-white hover:opacity-90 transition-opacity"
                >
                  Скопировать
                </button>
                <button
                  onClick={() => setInviteLink(null)}
                  className="w-full py-2 text-sm text-[var(--color_text_muted)] hover:text-white transition-colors"
                >
                  Создать новую
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* QR tab */}
        {tab === 'qr' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <p className="text-[var(--color_text_muted)] text-sm">
              Попросите атлета показать QR-код из профиля и отсканируйте его камерой телефона
            </p>
            <p className="text-xs text-[var(--color_text_muted)] mt-4 opacity-60">
              Сканер QR будет доступен в следующем обновлении
            </p>
          </motion.div>
        )}
      </div>
    </Drawer>
  );
}
