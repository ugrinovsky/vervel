import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const size = Math.min(512, pixelCrop.width, pixelCrop.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, size, size
  );

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.92)
  );
}

interface Props {
  src: string;
  onConfirm: (blob: Blob) => void;
  onClose: () => void;
}

export default function AvatarCropModal({ src, onConfirm, onClose }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [confirming, setConfirming] = useState(false);

  const onCropComplete = useCallback((_: Area, pixelCrop: Area) => {
    setCroppedArea(pixelCrop);
  }, []);

  const handleConfirm = async () => {
    if (!croppedArea || confirming) return;
    setConfirming(true);
    try {
      const blob = await getCroppedBlob(src, croppedArea);
      onConfirm(blob);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 safe-top">
        <button
          onClick={onClose}
          className="text-white/60 text-sm px-2 py-1"
        >
          Отмена
        </button>
        <span className="text-white text-sm font-semibold">Фото профиля</span>
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="text-sm font-semibold px-2 py-1 text-(--color_primary_light) disabled:opacity-50"
        >
          {confirming ? '…' : 'Готово'}
        </button>
      </div>

      {/* Cropper */}
      <div className="relative flex-1">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      {/* Zoom slider */}
      <div className="px-8 py-5 shrink-0 safe-bottom">
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full h-1 accent-white cursor-pointer"
        />
        <p className="text-center text-xs text-white/40 mt-2">
          Сдвиньте для выбора области
        </p>
      </div>
    </div>
  );
}
