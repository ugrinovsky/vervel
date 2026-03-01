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

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileApi.updateProfile({ bio, education, specializations });
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

        {/* Save */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
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
