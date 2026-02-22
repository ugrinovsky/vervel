import { useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';

interface Props {
  athleteId: number;
  name?: string | null;
  email?: string;
}

function buildIconDataUrl(color1: string, color2: string): string {
  // dumbbell icon (Material Design), scaled to fill a 120x120 rounded-square container
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color1}"/>
        <stop offset="100%" stop-color="${color2}"/>
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="28" fill="url(#bg)"/>
    <svg x="24" y="24" width="72" height="72" viewBox="0 0 24 24">
      <path fill="white" d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
    </svg>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export default function AthleteQrCode({ athleteId, name, email }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function generate() {
      if (!ref.current) return;

      const style = getComputedStyle(document.documentElement);
      const c1 = style.getPropertyValue('--color_primary_light').trim() || '#4ade80';
      const c2 = style.getPropertyValue('--color_primary_dark').trim() || '#166534';

      const qr = new QRCodeStyling({
        width: 260,
        height: 260,
        data: JSON.stringify({ athleteId }),
        image: buildIconDataUrl(c1, c2),
        qrOptions: {
          errorCorrectionLevel: 'H',
        },
        dotsOptions: {
          type: 'rounded',
          gradient: {
            type: 'linear',
            rotation: 0.785,
            colorStops: [
              { offset: 0, color: c1 },
              { offset: 1, color: c2 },
            ],
          },
        },
        cornersSquareOptions: {
          type: 'extra-rounded',
          gradient: {
            type: 'linear',
            rotation: 0.785,
            colorStops: [
              { offset: 0, color: c1 },
              { offset: 1, color: c2 },
            ],
          },
        },
        cornersDotOptions: {
          type: 'dot',
          color: c2,
        },
        backgroundOptions: {
          color: '#ffffff',
        },
        imageOptions: {
          crossOrigin: 'anonymous',
          margin: 6,
          imageSize: 0.28,
          hideBackgroundDots: true,
        },
      });

      ref.current.innerHTML = '';
      qr.append(ref.current);
    }

    generate();
    document.addEventListener('themechange', generate);
    return () => document.removeEventListener('themechange', generate);
  }, [athleteId]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={ref}
        className="rounded-2xl overflow-hidden shadow-lg"
        style={{ width: 260, height: 260 }}
      />
      {(name || email) && (
        <div className="text-center">
          {name && <div className="text-sm font-semibold text-white">{name}</div>}
          {email && <div className="text-xs text-(--color_text_muted)">{email}</div>}
        </div>
      )}
    </div>
  );
}
