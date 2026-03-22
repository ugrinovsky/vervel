import { resolvePhotoUrl } from '@/utils/photoUrl';
import { useImageLoad } from '@/hooks/useImageLoad';

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
  const { loaded, error, onLoad, onError } = useImageLoad();

  const baseStyle = { width: size, height: size };
  const sharedClass = `rounded-full shrink-0 border border-(--color_primary_icon)/30 ${className}`;

  if (src && !error) {
    return (
      <div style={baseStyle} className={`${sharedClass} relative overflow-hidden`}>
        {!loaded && <div className="absolute inset-0 animate-pulse bg-(--color_primary_icon)/15" />}
        <img
          src={src}
          alt={name || 'avatar'}
          loading="lazy"
          onError={onError}
          onLoad={onLoad}
          style={baseStyle}
          className={`object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
    );
  }

  return (
    <div
      style={{ ...baseStyle, fontSize }}
      className={`${sharedClass} bg-(--color_primary_icon)/20 flex items-center justify-center font-bold text-(--color_primary_icon)`}
    >
      {initials}
    </div>
  );
}
