import { useState, useEffect } from 'react';
import { getApiErrorMessage } from '@/utils/apiError';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import Tabs from '@/components/ui/Tabs';
import QrScanner from '@/components/QrScanner/QrScanner';
import { trainerApi } from '@/api/trainer';
import AccentButton from '@/components/ui/AccentButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AppInput from '@/components/ui/AppInput';
import PhoneInput from '@/components/ui/PhoneInput';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  onLeadCreated?: () => void;
}

type MainTab = 'lead' | 'connect';
type OtherTab = 'email' | 'qr';

function QrScanTab({ active, onAdded }: { active: boolean; onAdded: () => void }) {
  const [state, setState] = useState<'scanning' | 'loading' | 'success' | 'error'>('scanning');
  const [errorMsg, setErrorMsg] = useState('');

  const handleScan = async (raw: string) => {
    setState('loading');
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        parsed === null ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed) ||
        !('athleteId' in parsed) ||
        typeof parsed.athleteId !== 'number'
      ) {
        throw new Error('invalid qr');
      }
      await trainerApi.addByQr(parsed.athleteId);
      setState('success');
      toast.success('Атлет добавлен');
      setTimeout(onAdded, 800);
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Не удалось добавить атлета. Попробуйте снова.');
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
        <LoadingSpinner variant="primaryArc" />
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

export default function AddAthleteDrawer({ open, onClose, onAdded, onLeadCreated }: Props) {
  const [mainTab, setMainTab] = useState<MainTab>('lead');
  const [showOtherMethods, setShowOtherMethods] = useState(false);
  const [otherTab, setOtherTab] = useState<OtherTab>('email');
  const [email, setEmail] = useState('');
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadSource, setLeadSource] = useState('');
  const [leadNote, setLeadNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMainTab('lead');
      setShowOtherMethods(false);
      setOtherTab('email');
      setInviteLink(null);
      setLeadName('');
      setLeadPhone('');
      setLeadSource('');
      setLeadNote('');
    }
  }, [open]);

  const handleCreateLead = async () => {
    if (!leadName.trim() || !leadPhone.trim()) return;
    setLoading(true);
    try {
      await trainerApi.createLead({
        name: leadName.trim(),
        phone: leadPhone.trim(),
        note: leadNote.trim() || null,
        source: leadSource || 'manual',
      });
      toast.success('Клиент записан');
      onLeadCreated?.();
      onClose();
    } catch {
      toast.error('Не удалось записать клиента');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <BottomSheet id="add-athlete" open={open} onClose={onClose} title="Добавить клиента" emoji="➕">
      <div className="space-y-4">
        <Tabs
          tabs={[
            { id: 'lead', label: 'Записать клиента' },
            { id: 'connect', label: 'Подключить атлета' },
          ]}
          active={mainTab}
          onChange={setMainTab}
        />

        {mainTab === 'lead' ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <p className="text-xs text-(--color_text_muted) leading-relaxed">
              Быстрый CRM-режим: запишите потенциального клиента сейчас, даже если он ещё не
              зарегистрирован в приложении.
            </p>
            <AppInput
              value={leadName}
              onChange={(e) => setLeadName(e.target.value)}
              placeholder="Имя клиента"
            />
            <PhoneInput
              value={leadPhone}
              onChange={setLeadPhone}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateLead()}
            />
            <div>
              <div className="text-xs text-(--color_text_muted) mb-2">Откуда клиент</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: '', label: 'Не указано' },
                  { value: 'referral', label: 'Сарафан' },
                  { value: 'instagram', label: 'Instagram' },
                  { value: 'gym', label: 'Зал' },
                  { value: 'other', label: 'Другое' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLeadSource(value)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                      leadSource === value
                        ? 'bg-(--color_primary_light)/20 border-(--color_primary_light)/50 text-white'
                        : 'border-(--color_border) text-(--color_text_muted) hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={leadNote}
              onChange={(e) => setLeadNote(e.target.value)}
              placeholder="Заметка: цель, откуда пришёл, что обещали"
              rows={3}
              className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors resize-none placeholder:text-(--color_text_muted) leading-relaxed"
            />
            <AccentButton
              onClick={handleCreateLead}
              disabled={loading || !leadName.trim() || !leadPhone.trim()}
              loading={loading}
              loadingText="Записываем..."
            >
              Записать клиента
            </AccentButton>
          </motion.div>
        ) : (
          <>
            <p className="text-xs text-(--color_text_muted) leading-relaxed">
              <span className="text-white/90 font-medium">Подключение к приложению:</span> отправьте
              атлету ссылку, он зарегистрируется сам. Email и QR доступны ниже.
            </p>

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

            <button
              type="button"
              onClick={() => setShowOtherMethods((v) => !v)}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-(--color_border) bg-(--color_bg_card_hover) px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/[0.06] transition-colors"
            >
              <span>Другие способы (email, QR)</span>
              <span className="text-(--color_text_muted) text-xs">
                {showOtherMethods ? '▼' : '▶'}
              </span>
            </button>

            {showOtherMethods && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 rounded-xl border border-(--color_border) bg-(--color_bg_card) p-3"
              >
                <Tabs
                  tabs={[
                    { id: 'email', label: 'По email' },
                    { id: 'qr', label: 'QR-код' },
                  ]}
                  active={otherTab}
                  onChange={setOtherTab}
                />
                {otherTab === 'email' && (
                  <div className="space-y-3 pt-1">
                    <AppInput
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
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
                  </div>
                )}
                {otherTab === 'qr' && (
                  <QrScanTab
                    active={otherTab === 'qr' && open && showOtherMethods}
                    onAdded={() => {
                      onAdded();
                      onClose();
                    }}
                  />
                )}
              </motion.div>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  );
}
