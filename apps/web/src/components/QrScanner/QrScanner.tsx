import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

interface Props {
  onScan: (data: string) => void;
  active: boolean;
}

export default function QrScanner({ onScan, active }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!active) {
      stopCamera();
      return;
    }

    startCamera();
    return () => stopCamera();
  }, [active]);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
        tick();
      }
    } catch {
      setError('Нет доступа к камере');
    }
  }

  function stopCamera() {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  function tick() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animRef.current = requestAnimationFrame(tick);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });

    if (code?.data) {
      onScan(code.data);
      return; // stop scanning after success
    }

    animRef.current = requestAnimationFrame(tick);
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="text-4xl">📷</div>
        <p className="text-sm text-(--color_text_muted) text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: '1' }}>
      <video
        ref={videoRef}
        className={`w-full h-full object-cover transition-opacity duration-300 ${scanning ? 'opacity-100' : 'opacity-0'}`}
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Corner markers */}
      {scanning && (
        <>
          {/* Top-left */}
          <div className="absolute top-5 left-5 w-8 h-8 border-t-[3px] border-l-[3px] rounded-tl-lg border-(--color_primary_light)" />
          {/* Top-right */}
          <div className="absolute top-5 right-5 w-8 h-8 border-t-[3px] border-r-[3px] rounded-tr-lg border-(--color_primary_light)" />
          {/* Bottom-left */}
          <div className="absolute bottom-5 left-5 w-8 h-8 border-b-[3px] border-l-[3px] rounded-bl-lg border-(--color_primary_light)" />
          {/* Bottom-right */}
          <div className="absolute bottom-5 right-5 w-8 h-8 border-b-[3px] border-r-[3px] rounded-br-lg border-(--color_primary_light)" />

          {/* Scan line */}
          <div className="absolute inset-x-5 h-px bg-(--color_primary_light) opacity-70 top-1/2" />
        </>
      )}

      {!scanning && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-sm text-white/50">Инициализация камеры...</div>
        </div>
      )}
    </div>
  );
}
