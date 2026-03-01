import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import { profileApi, type ProfileUser } from '@/api/profile';
import { CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';
import BackButton from '@/components/BackButton/BackButton';

export default function TrainerPersonalScreen() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [bio, setBio] = useState('');
  const [education, setEducation] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [specInput, setSpecInput] = useState('');
  const [donatePhone, setDonatePhone] = useState('');
  const [donateCard, setDonateCard] = useState('');
  const [donateYookassaLink, setDonateYookassaLink] = useState('');
  const [donateErrors, setDonateErrors] = useState<{ phone?: string; card?: string; link?: string }>({});
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    profileApi
      .getProfile()
      .then((res) => {
        if (res.data.success) {
          const u = res.data.data.user;
          setUser(u);
          setBio(u.bio || '');
          setEducation(u.education || '');
          setSpecializations(u.specializations || []);
          setPhotoPreview(u.photoUrl || null);
          setDonatePhone(u.donatePhone || '');
          setDonateCard(u.donateCard || '');
          setDonateYookassaLink(u.donateYookassaLink || '');
        }
      })
      .catch(() => toast.error('Ошибка загрузки профиля'));
  }, []);

  const handlePhotoChange = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploadingPhoto(true);
    try {
      const res = await profileApi.uploadPhoto(file);
      setPhotoPreview(res.data.data.photoUrl);
      toast.success('Фото обновлено');
    } catch {
      toast.error('Ошибка загрузки фото');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const addSpec = () => {
    const val = specInput.trim();
    if (val && !specializations.includes(val)) {
      setSpecializations([...specializations, val]);
    }
    setSpecInput('');
  };

  const removeSpec = (s: string) => {
    setSpecializations(specializations.filter((x) => x !== s));
  };

  const validateDonate = (): boolean => {
    const errors: { phone?: string; card?: string; link?: string } = {};

    if (donatePhone) {
      const digits = donatePhone.replace(/[\s\-()]/g, '');
      if (!/^(\+7|7|8)\d{10}$/.test(digits)) {
        errors.phone = 'Введите номер в формате +7 900 123-45-67';
      }
    }

    if (donateCard) {
      const digits = donateCard.replace(/\s/g, '');
      if (!/^\d{13,19}$/.test(digits)) {
        errors.card = 'Номер карты должен содержать от 13 до 19 цифр';
      }
    }

    if (donateYookassaLink) {
      try {
        const url = new URL(donateYookassaLink);
        const allowed = ['yookassa.ru', 'yoomoney.ru', 'money.yandex.ru', 'yandex.ru'];
        if (!allowed.some((d) => url.hostname === d || url.hostname.endsWith('.' + d))) {
          errors.link = 'Ссылка должна быть с сайта yookassa.ru или yoomoney.ru';
        }
      } catch {
        errors.link = 'Введите корректный URL (https://...)';
      }
    }

    setDonateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateDonate()) return;
    setSaving(true);
    try {
      await profileApi.updateProfile({ bio, education, specializations, donatePhone: donatePhone || null, donateCard: donateCard || null, donateYookassaLink: donateYookassaLink || null });
      toast.success('Профиль сохранён');
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  return (
    <Screen>
      <div className="p-4 w-full max-w-2xl mx-auto">
        <BackButton onClick={() => navigate(-1)} />

        <ScreenHeader icon="🪪" title="Профессиональный профиль" description="Фото, специализации и образование — видно вашим атлетам" />

        {/* Photo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-6"
        >
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-(--color_primary_light) to-(--color_primary) flex items-center justify-center">
              {photoPreview ? (
                <img src={photoPreview} alt="photo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-white">{initials}</span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-(--color_primary_light) flex items-center justify-center border-2 border-(--color_bg_card) hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {uploadingPhoto ? (
                <div className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" />
              ) : (
                <CameraIcon className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePhotoChange(file);
            }}
          />
          <p className="text-xs text-(--color_text_muted) mt-2">Нажмите на камеру для смены фото</p>
        </motion.div>

        {/* Bio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border) mb-4"
        >
          <label className="text-sm font-medium text-white mb-2 block">О себе</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 500))}
            rows={4}
            placeholder="Расскажите о своём опыте, подходе к тренировкам…"
            className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-4 py-3 text-white text-sm resize-none outline-none focus:border-(--color_primary_light) transition-colors placeholder:text-(--color_text_muted)"
          />
          <p className="text-xs text-(--color_text_muted) text-right mt-1">{bio.length}/500</p>
        </motion.div>

        {/* Education */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border) mb-4"
        >
          <label className="text-sm font-medium text-white mb-2 block">Образование</label>
          <input
            type="text"
            value={education}
            onChange={(e) => setEducation(e.target.value)}
            placeholder="ВУЗ, специальность, курсы…"
            className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors placeholder:text-(--color_text_muted)"
          />
        </motion.div>

        {/* Specializations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border) mb-6"
        >
          <label className="text-sm font-medium text-white mb-2 block">Специализации</label>

          {specializations.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {specializations.map((s) => (
                <span
                  key={s}
                  className="flex items-center gap-1 px-3 py-1 rounded-full bg-(--color_primary_light)/20 text-(--color_primary_light) text-sm"
                >
                  {s}
                  <button
                    onClick={() => removeSpec(s)}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={specInput}
              onChange={(e) => setSpecInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSpec();
                }
              }}
              placeholder="Кроссфит, Силовые, HIIT… (Enter)"
              className="flex-1 bg-(--color_bg_input) border border-(--color_border) rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors placeholder:text-(--color_text_muted)"
            />
            <button
              onClick={addSpec}
              className="px-4 py-3 rounded-xl bg-(--color_primary_light) text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              +
            </button>
          </div>
        </motion.div>

        {/* Donation requisites */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border) mb-6"
        >
          <label className="text-sm font-medium text-white mb-1 block">Реквизиты для поддержки</label>
          <p className="text-xs text-(--color_text_muted) mb-4">
            Атлеты смогут поддержать вас финансово на вашей странице профиля
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-(--color_text_muted) mb-1 block">Телефон для СБП</label>
              <input
                type="tel"
                value={donatePhone}
                onChange={(e) => {
                  setDonateErrors((prev) => ({ ...prev, phone: undefined }));
                  const raw = e.target.value.replace(/[^\d+]/g, '');
                  // Normalize prefix
                  let digits = raw.startsWith('+') ? '+' + raw.slice(1).replace(/\D/g, '') : raw.replace(/\D/g, '');
                  if (digits.startsWith('8')) digits = '+7' + digits.slice(1);
                  else if (digits.startsWith('7') && !digits.startsWith('+7')) digits = '+7' + digits.slice(1);
                  else if (!digits.startsWith('+')) digits = '+7' + digits;
                  // Keep only +7 + 10 digits
                  const num = digits.replace(/^\+7/, '').replace(/\D/g, '').slice(0, 10);
                  // Format: +7 XXX XXX-XX-XX
                  let formatted = '+7';
                  if (num.length > 0) formatted += ' ' + num.slice(0, 3);
                  if (num.length > 3) formatted += ' ' + num.slice(3, 6);
                  if (num.length > 6) formatted += '-' + num.slice(6, 8);
                  if (num.length > 8) formatted += '-' + num.slice(8, 10);
                  setDonatePhone(formatted);
                }}
                placeholder="+7 900 123-45-67"
                className={`w-full bg-(--color_bg_input) border rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-(--color_text_muted) ${donateErrors.phone ? 'border-red-500/60 focus:border-red-400' : 'border-(--color_border) focus:border-(--color_primary_light)'}`}
              />
              {donateErrors.phone && <p className="text-xs text-red-400 mt-1">{donateErrors.phone}</p>}
            </div>

            <div>
              <label className="text-xs text-(--color_text_muted) mb-1 block">Номер карты</label>
              <input
                type="text"
                inputMode="numeric"
                value={donateCard}
                onChange={(e) => {
                  setDonateErrors((prev) => ({ ...prev, card: undefined }));
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                  const formatted = digits.replace(/(.{4})/g, '$1 ').trim();
                  setDonateCard(formatted);
                }}
                placeholder="0000 0000 0000 0000"
                maxLength={19}
                className={`w-full bg-(--color_bg_input) border rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-(--color_text_muted) ${donateErrors.card ? 'border-red-500/60 focus:border-red-400' : 'border-(--color_border) focus:border-(--color_primary_light)'}`}
              />
              {donateErrors.card && <p className="text-xs text-red-400 mt-1">{donateErrors.card}</p>}
            </div>

            <div>
              <label className="text-xs text-(--color_text_muted) mb-1 block">
                Ссылка ЮКасса{' '}
                <span className="text-(--color_text_muted) font-normal">(необязательно)</span>
              </label>
              <input
                type="url"
                value={donateYookassaLink}
                onChange={(e) => {
                  setDonateErrors((prev) => ({ ...prev, link: undefined }));
                  setDonateYookassaLink(e.target.value);
                }}
                placeholder="https://yoomoney.ru/to/..."
                className={`w-full bg-(--color_bg_input) border rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-(--color_text_muted) ${donateErrors.link ? 'border-red-500/60 focus:border-red-400' : 'border-(--color_border) focus:border-(--color_primary_light)'}`}
              />
              {donateErrors.link && <p className="text-xs text-red-400 mt-1">{donateErrors.link}</p>}
              <p className="text-xs text-(--color_text_muted) mt-1">
                Создайте ссылку в личном кабинете ЮКасса → Приём платежей → Форма оплаты
              </p>
            </div>
          </div>
        </motion.div>

        {/* Save */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold bg-(--color_primary_light) text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Сохранение...' : 'Сохранить профиль'}
        </motion.button>
      </div>
    </Screen>
  );
}
