import { resolvePhotoUrl } from '@/utils/photoUrl';

interface Props {
  photoUrl?: string | null;
  name?: string | null;
  size: number;
  className?: string;
}

function getInitials(name?: string | null): string {
  if (!name) return '';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function UserAvatar({ photoUrl, name, size, className = '' }: Props) {
  const src = resolvePhotoUrl(photoUrl);
  const initials = getInitials(name);
  const fontSize = Math.round(size * 0.36);

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'avatar'}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize }}
      className={`rounded-full bg-linear-to-br from-(--color_primary_light) to-(--color_primary) flex items-center justify-center text-white font-bold shrink-0 ${className}`}
    >
      {initials}
    </div>
  );
}
