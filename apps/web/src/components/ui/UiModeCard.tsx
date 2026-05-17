import { motion } from 'framer-motion';
import type { JSX } from 'react';
import type { UiMode, UiModeContext } from '@/util/uiModeCopy';
import { uiModeCardCopy } from '@/util/uiModeCopy';

export default function UiModeCard({
  mode,
  ctx,
  onClick,
}: {
  mode: UiMode;
  ctx: UiModeContext;
  onClick: () => void;
}): JSX.Element {
  const copy = uiModeCardCopy(mode, ctx);

  if (mode === 'unleash') {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        className="rounded-2xl border-2 border-orange-500 p-4 text-left relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(234,88,12,0.25), rgba(239,68,68,0.15))',
        }}
        animate={{
          boxShadow: [
            '0 0 16px rgba(249,115,22,0.3)',
            '0 0 32px rgba(239,68,68,0.55)',
            '0 0 16px rgba(249,115,22,0.3)',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="text-2xl mb-1">{copy.emoji}</div>
        <div className="font-black text-white text-lg tracking-tight">{copy.title}</div>
        <div className="text-xs text-orange-200/80 mt-1">{copy.subtitle}</div>
        {copy.unleashBadge && (
          <div className="absolute top-2 right-3 text-[10px] font-bold text-orange-400/80 uppercase tracking-widest">
            {copy.unleashBadge.text}
          </div>
        )}
      </motion.button>
    );
  }

  const baseClass =
    mode === 'pro'
      ? 'rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-left hover:bg-emerald-500/15 transition-colors'
      : 'glass rounded-2xl p-4 text-left hover:border-emerald-500/40 transition-colors';

  return (
    <button type="button" onClick={onClick} className={baseClass}>
      {copy.tag ? (
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{copy.emoji}</span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">
            {copy.tag.text}
          </span>
        </div>
      ) : (
        <div className="text-2xl mb-1">{copy.emoji}</div>
      )}
      <div className="font-semibold text-white">{copy.title}</div>
      <div className="text-xs text-(--color_text_muted) mt-1">{copy.subtitle}</div>
    </button>
  );
}
