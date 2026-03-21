import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import { profileApi, type ProfileUser } from '@/api/profile';
import { CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';
import BackButton from '@/components/BackButton/BackButton';
import FormField from '@/components/FormField';
import AvatarCropModal from '@/components/AvatarCropModal/AvatarCropModal';
import UserAvatar from '@/components/UserAvatar/UserAvatar';
import AccentButton from '@/components/ui/AccentButton';

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
  const [donateErrors, setDonateErrors] = useState<{
    phone?: string;
    card?: string;
    link?: string;
  }>({});
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

  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropConfirm = async (blob: Blob) => {
    setCropSrc(null);
    setUploadingPhoto(true);
    try {
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
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
      await profileApi.updateProfile({
        bio,
        education,
        specializations,
        donatePhone: donatePhone || null,
        donateCard: donateCard || null,
        donateYookassaLink: donateYookassaLink || null,
      });
      toast.success('Профиль сохранён');
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };


  return (
    <Screen className="trainer-personal-screen">
      <div className="p-4 w-full mx-auto">
        <BackButton onClick={() => navigate(-1)} />

        <ScreenHeader
          icon="🪪"
          title="Профессиональный профиль"
          description="Фото, специализации и образование — видно вашим атлетам"
        />

        {/* Hint */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-(--color_bg_card) rounded-xl px-4 py-3 border border-(--color_border) mb-4 flex items-start gap-3"
        >
          <span className="text-xl shrink-0">💡</span>
          <p className="text-xs text-(--color_text_muted) leading-relaxed">
            Ваш профиль виден атлетам на странице команды и в ссылке-приглашении.{' '}
            <span className="text-white">Заполненный профиль</span> повышает доверие — атлет видит ваше фото, специализации и опыт ещё до того, как примет приглашение.
          </p>
        </motion.div>

        {cropSrc && (
          <AvatarCropModal
            src={cropSrc}
            onConfirm={handleCropConfirm}
            onClose={() => setCropSrc(null)}
          />
        )}

        {/* Photo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-6"
        >
          <div className="relative">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
              className="relative block"
            >
              <UserAvatar photoUrl={photoPreview} name={user?.fullName || user?.email} size={96} />
              <div className="absolute inset-0 rounded-full bg-black/30 flex flex-col items-center justify-center gap-1">
                <CameraIcon className="w-6 h-6 text-white" />
                <span className="text-[10px] text-white/80 font-medium leading-none">Фото</span>
              </div>
              {uploadingPhoto && (
                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <p className="text-xs text-(--color_text_muted) mt-2">Нажмите для смены фото</p>
        </motion.div>

        {/* Bio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border) mb-4"
        >
          <FormField label="О себе">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 500))}
              rows={4}
              placeholder="Расскажите о своём опыте, подходе к тренировкам…"
              className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-4 py-3 text-white text-sm resize-none outline-none focus:border-(--color_primary_light) transition-colors placeholder:text-(--color_text_muted)"
            />
          </FormField>
          <p className="text-xs text-(--color_text_muted) text-right mt-1">{bio.length}/500</p>
        </motion.div>

        {/* Education */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border) mb-4"
        >
          <FormField label="Образование">
            <input
              type="text"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              placeholder="ВУЗ, специальность, курсы…"
              className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors placeholder:text-(--color_text_muted)"
            />
          </FormField>
        </motion.div>

        {/* Specializations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border) mb-6"
        >
          <FormField label="Специализации">
            <>
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
                  placeholder="Кроссфит, Силовые, HIIT…"
                  className="flex-1 bg-(--color_bg_input) border border-(--color_border) rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors placeholder:text-(--color_text_muted)"
                />
                <AccentButton size="sm" onClick={addSpec} className="px-4 py-3 rounded-xl">
                  +
                </AccentButton>
              </div>
            </>
          </FormField>
        </motion.div>

        {/* Donation requisites */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border) mb-6"
        >
          <FormField label="Реквизиты для поддержки">
            <p className="text-xs text-(--color_text_muted) mb-4">
              Атлеты смогут поддержать вас финансово на вашей странице профиля
            </p>
            <div className="space-y-3">
              <FormField label="Телефон для СБП">
                <input
                  type="tel"
                  value={donatePhone}
                  onChange={(e) => {
                    setDonateErrors((prev) => ({ ...prev, phone: undefined }));
                    const raw = e.target.value.replace(/[^\d+]/g, '');
                    // Normalize prefix
                    let digits = raw.startsWith('+')
                      ? '+' + raw.slice(1).replace(/\D/g, '')
                      : raw.replace(/\D/g, '');
                    if (digits.startsWith('8')) digits = '+7' + digits.slice(1);
                    else if (digits.startsWith('7') && !digits.startsWith('+7'))
                      digits = '+7' + digits.slice(1);
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
                {donateErrors.phone && (
                  <p className="text-xs text-red-400 mt-1">{donateErrors.phone}</p>
                )}
              </FormField>

              <FormField label="Номер карты">
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
                {donateErrors.card && (
                  <p className="text-xs text-red-400 mt-1">{donateErrors.card}</p>
                )}
              </FormField>

              <FormField
                label={
                  <>
                    Ссылка ЮКасса{' '}
                    <span className="text-(--color_text_muted) font-normal">(необязательно)</span>
                  </>
                }
              >
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
                {donateErrors.link && (
                  <p className="text-xs text-red-400 mt-1">{donateErrors.link}</p>
                )}
                <p className="text-xs text-(--color_text_muted) mt-1">
                  Создайте ссылку в личном кабинете ЮКасса → Приём платежей → Форма оплаты
                </p>
              </FormField>
            </div>
          </FormField>
        </motion.div>

        {/* Save */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <AccentButton
            onClick={handleSave}
            disabled={saving}
            loading={saving}
            loadingText="Сохранение..."
            className="font-semibold"
          >
            Сохранить профиль
          </AccentButton>
        </motion.div>
      </div>
    </Screen>
  );
}
