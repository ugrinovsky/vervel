import { PWA_STEPS } from './pwaInstallShared';

export function PwaInstructions({ platform }: { platform: 'ios' | 'android' | 'desktop' }) {
  const { hint, steps } = PWA_STEPS[platform];
  return (
    <div className="space-y-3 mt-1">
      <p className="text-xs text-(--color_text_muted)">{hint}</p>
      <ol className="space-y-1.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-(--color_text_muted)">
            <span className="shrink-0 w-4 h-4 rounded-full bg-(--color_bg_card_hover) text-white flex items-center justify-center text-[10px] mt-0.5">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
