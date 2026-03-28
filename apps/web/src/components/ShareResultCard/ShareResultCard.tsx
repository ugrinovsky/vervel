import toast from 'react-hot-toast';
import type { ProfileData } from '@/api/profile';
import { drawProfileCard, shareCanvas } from '@/utils/shareCard';
import IconButton from '@/components/ui/IconButton';
import { ArrowUpOnSquareIcon } from '@heroicons/react/24/outline';

interface Props {
  profileData: ProfileData;
}

export default function ShareResultCard({ profileData }: Props) {
  const handleShare = async () => {
    const canvas = document.createElement('canvas');
    try {
      await drawProfileCard(canvas, profileData);
      await shareCanvas(canvas);
    } catch {
      toast.error('Не удалось создать карточку');
    }
  };

  return (
    <IconButton onClick={handleShare} className="w-full justify-center py-3 text-sm">
      <ArrowUpOnSquareIcon className="w-4 h-4" />
      Поделиться результатами
    </IconButton>
  );
}
