import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  maleBody,
  femaleBody,
  type BodySide,
  type BodyGender,
  type BodyPartDef,
} from './bodyZones';

// ── Cylinder helpers ──────────────────────────────────────────────────────────
function cylinderFromViewBox(vb: string) {
  const [minX, minY, w, h] = vb.split(' ').map(Number);
  return {
    cx:   minX + w / 2,
    topY: minY + h * 0.935,
    botY: minY + h * 0.975,
    rx:   w * 0.44,
    ry:   w * 0.025,
  };
}

// Crop horizontal dead space: trim cropPct from each side
function cropViewBox(vb: string, cropPct = 0.08): string {
  const [minX, minY, w, h] = vb.split(' ').map(Number);
  const trim = w * cropPct;
  return `${minX + trim} ${minY} ${w - trim * 2} ${h}`;
}

// ── Color helpers ──────────────────────────────────────────────────────────────
function zoneColor(intensity: number, alpha: number): string {
  const hue =
    intensity <= 0.5
      ? 140 - intensity * 2 * 92
      : 48 - (intensity - 0.5) * 2 * 53;
  return `hsla(${hue}, 88%, 58%, ${alpha})`;
}

function zoneStrokeColor(intensity: number): string {
  const hue =
    intensity <= 0.5
      ? 140 - intensity * 2 * 92
      : 48 - (intensity - 0.5) * 2 * 53;
  return `hsla(${hue}, 92%, 72%, ${0.45 + intensity * 0.4})`;
}

function getPaths(part: BodyPartDef): string[] {
  return [
    ...(part.path.common ?? []),
    ...(part.path.left   ?? []),
    ...(part.path.right  ?? []),
  ];
}

// ── Component ─────────────────────────────────────────────────────────────────
interface BodySVGProps {
  zoneIntensities?: Record<string, number>;
  selectedZone?: string | null;
  onZoneClick?: (zoneName: string) => void;
  gender?: BodyGender;
}

const BodySVG: React.FC<BodySVGProps> = ({
  zoneIntensities = {},
  selectedZone    = null,
  onZoneClick,
  gender = 'male',
}) => {
  const [side, setSide]         = useState<BodySide>('front');
  const [showFill, setShowFill] = useState(false);

  useEffect(() => {
    setShowFill(false);
    const t = setTimeout(() => setShowFill(true), 700);
    return () => clearTimeout(t);
  }, [side, gender]);

  const bodyData = gender === 'female' ? femaleBody : maleBody;
  const viewDef  = bodyData[side];
  const { viewBox: rawViewBox, outline, parts } = viewDef;
  const viewBox = cropViewBox(rawViewBox, 0.08);
  const cyl = cylinderFromViewBox(viewBox);

  const exerciseParts  = parts.filter((p) => p.appZone !== null);
  const structuralParts = parts.filter((p) => p.appZone === null);

  const getFill = (zoneId: string) => {
    const intensity = zoneIntensities[zoneId] || 0;
    if (intensity <= 0) return 'transparent';
    return zoneColor(intensity, zoneId === selectedZone ? 0.62 : 0.22 + intensity * 0.38);
  };

  const getGlowFill = (zoneId: string) =>
    zoneColor(zoneIntensities[zoneId] || 0, 0.42);

  const getOutlineStroke = (zoneId: string) => {
    if (zoneId === selectedZone) return 'rgba(255,255,255,0.75)';
    const intensity = zoneIntensities[zoneId] || 0;
    if (intensity > 0) return zoneColor(intensity, 0.15 + intensity * 0.25);
    return 'rgba(255,255,255,0.10)';
  };

  return (
    <div className="avatar-wrapper glass relative" style={{ paddingBottom: 0 }}>
      {/* ── Front / Back toggle ─────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 10,
          display: 'flex',
          gap: 2,
          background: 'var(--color_bg_card)',
          borderRadius: 8,
          padding: '3px',
          border: '1px solid var(--color_border)',
        }}
      >
        {(['front', 'back'] as BodySide[]).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            style={{
              padding: '2px 8px',
              borderRadius: 5,
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              background: side === s ? 'var(--color_primary)' : 'transparent',
              color: side === s ? 'white' : 'var(--color_text_muted)',
              transition: 'all 0.18s',
              lineHeight: 1.4,
            }}
          >
            {s === 'front' ? 'Перед' : 'Зад'}
          </button>
        ))}
      </div>

      {/* Ambient radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: 'inherit',
          background:
            'radial-gradient(ellipse 65% 45% at 50% 22%, rgb(var(--color_primary_light_ch) / 0.09) 0%, transparent 70%)',
        }}
      />

      <AnimatePresence mode="wait">
        <motion.svg
          key={`${gender}-${side}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox={viewBox}
          className="w-full"
          style={{ pointerEvents: 'all', display: 'block' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <defs>
            <filter id="av-zone-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
              <feColorMatrix in="blur" type="saturate" values="1.8" result="sat" />
              <feMerge>
                <feMergeNode in="sat" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <linearGradient id="av-cyl-body" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   style={{ stopColor: 'var(--color_primary_dark)', stopOpacity: 0.65 }} />
              <stop offset="18%"  style={{ stopColor: 'var(--color_primary_light)', stopOpacity: 0.18 }} />
              <stop offset="40%"  style={{ stopColor: 'var(--color_primary_light)', stopOpacity: 0.06 }} />
              <stop offset="68%"  style={{ stopColor: 'var(--color_primary_light)', stopOpacity: 0.14 }} />
              <stop offset="100%" style={{ stopColor: 'var(--color_primary_dark)', stopOpacity: 0.6 }} />
            </linearGradient>
            <linearGradient id="av-cyl-top" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   style={{ stopColor: 'var(--color_primary_light)', stopOpacity: 0.55 }} />
              <stop offset="45%"  style={{ stopColor: 'var(--color_primary_light)', stopOpacity: 0.22 }} />
              <stop offset="100%" style={{ stopColor: 'var(--color_primary_dark)', stopOpacity: 0.4 }} />
            </linearGradient>
            <radialGradient id="av-cyl-spec" cx="38%" cy="38%" r="50%">
              <stop offset="0%"   style={{ stopColor: 'white', stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: 'white', stopOpacity: 0 }} />
            </radialGradient>
            <linearGradient id="av-cyl-bot" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   style={{ stopColor: 'var(--color_primary_dark)', stopOpacity: 0.28 }} />
              <stop offset="100%" style={{ stopColor: 'var(--color_primary_dark)', stopOpacity: 0.06 }} />
            </linearGradient>
            <radialGradient id="av-cyl-shadow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   style={{ stopColor: 'black', stopOpacity: 0.35 }} />
              <stop offset="100%" style={{ stopColor: 'black', stopOpacity: 0 }} />
            </radialGradient>
          </defs>

          {/* ── Body outline ─────────────────────────────────────────────── */}
          <motion.path
            d={outline}
            fill="none"
            stroke="rgba(176,200,210,0.45)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          />

          {/* ── Structural parts (head, neck, hands, feet, etc.) ─────────── */}
          <g style={{ pointerEvents: 'none' }}>
            {structuralParts.map((p) =>
              getPaths(p).map((d, i) => (
                <path
                  key={`s-${p.slug}-${i}`}
                  d={d}
                  fill="rgba(176,200,210,0.06)"
                  stroke="rgba(176,200,210,0.13)"
                  strokeWidth={0.5}
                />
              ))
            )}
          </g>

          {/* ── Zone overlay ─────────────────────────────────────────────── */}
          <g>
            {/* Invisible click hitboxes */}
            {exerciseParts.map((p) =>
              getPaths(p).map((d, i) => (
                <path
                  key={`hb-${p.slug}-${i}`}
                  d={d}
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth={22}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  onClick={() => onZoneClick?.(p.appZone!)}
                  style={{ cursor: 'pointer', pointerEvents: 'all' }}
                />
              ))
            )}

            {/* Zone outline strokes */}
            {exerciseParts.map((p, zi) =>
              getPaths(p).map((d, i) => (
                <motion.path
                  key={`zo-${p.slug}-${i}`}
                  d={d}
                  fill="none"
                  stroke={getOutlineStroke(p.appZone!)}
                  strokeWidth={p.appZone === selectedZone ? 1.8 : 1.0}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    pathLength: { duration: 0.8, delay: zi * 0.018, ease: 'easeInOut' },
                  }}
                  style={{ pointerEvents: 'none' }}
                />
              ))
            )}

            {/* Zone fills + glow */}
            {showFill &&
              exerciseParts.map((p) => {
                const zoneId    = p.appZone!;
                const intensity = zoneIntensities[zoneId] || 0;
                const fill      = getFill(zoneId);
                if (fill === 'transparent') return null;

                const isHigh   = intensity > 0.65;
                const isMedium = intensity > 0.35;
                const paths    = getPaths(p);

                return (
                  <g key={`zf-${p.slug}`} style={{ pointerEvents: 'none' }}>
                    {(isHigh || isMedium) &&
                      paths.map((d, i) => (
                        <motion.path
                          key={`zg-${p.slug}-${i}`}
                          d={d}
                          fill={getGlowFill(zoneId)}
                          stroke="none"
                          filter="url(#av-zone-glow)"
                          initial={{ opacity: 0 }}
                          animate={isHigh ? { opacity: [0, 0.65, 0.32, 0.65, 0] } : { opacity: 0.38 }}
                          transition={
                            isHigh
                              ? { opacity: { duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 } }
                              : { duration: 0.65, delay: 0.1 }
                          }
                        />
                      ))}

                    {paths.map((d, i) => (
                      <motion.path
                        key={`zc-${p.slug}-${i}`}
                        d={d}
                        fill={fill}
                        stroke={zoneStrokeColor(intensity)}
                        strokeWidth={1.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.55, delay: 0.12 }}
                      />
                    ))}

                    {zoneId === selectedZone &&
                      paths.map((d, i) => (
                        <motion.path
                          key={`zs-${p.slug}-${i}`}
                          d={d}
                          fill="none"
                          stroke="rgba(255,255,255,0.65)"
                          strokeWidth={2.0}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{
                            opacity: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                          }}
                        />
                      ))}
                  </g>
                );
              })}
          </g>

          {/* ── Cylinder pedestal ────────────────────────────────────────── */}
          <g>
            <ellipse
              cx={cyl.cx} cy={cyl.botY + 10}
              rx={cyl.rx + 16} ry={cyl.ry + 2}
              fill="url(#av-cyl-shadow)" opacity={0.55}
            />
            <path
              d={`M ${cyl.cx - cyl.rx} ${cyl.topY} L ${cyl.cx - cyl.rx} ${cyl.botY} A ${cyl.rx} ${cyl.ry} 0 0 1 ${cyl.cx + cyl.rx} ${cyl.botY} L ${cyl.cx + cyl.rx} ${cyl.topY}`}
              fill="url(#av-cyl-body)"
              style={{ stroke: 'var(--color_primary_light)', strokeOpacity: 0.12, strokeWidth: 0.5 }}
            />
            <line
              x1={cyl.cx - cyl.rx} y1={cyl.topY}
              x2={cyl.cx - cyl.rx} y2={cyl.botY}
              style={{ stroke: 'var(--color_primary_light)', strokeOpacity: 0.55, strokeWidth: 1.8 }}
            />
            <line
              x1={cyl.cx + cyl.rx} y1={cyl.topY}
              x2={cyl.cx + cyl.rx} y2={cyl.botY}
              style={{ stroke: 'var(--color_primary_light)', strokeOpacity: 0.55, strokeWidth: 1.8 }}
            />
            <ellipse
              cx={cyl.cx} cy={cyl.botY} rx={cyl.rx} ry={cyl.ry}
              fill="url(#av-cyl-bot)"
              style={{ stroke: 'var(--color_primary_light)', strokeOpacity: 0.18, strokeWidth: 0.8 }}
            />
            <ellipse
              cx={cyl.cx} cy={cyl.topY} rx={cyl.rx} ry={cyl.ry}
              fill="url(#av-cyl-top)"
              style={{ stroke: 'var(--color_primary_light)', strokeOpacity: 0.62, strokeWidth: 1.6 }}
            />
            <ellipse
              cx={cyl.cx - 14} cy={cyl.topY - 3}
              rx={cyl.rx * 0.48} ry={cyl.ry * 0.48}
              fill="url(#av-cyl-spec)"
            />
            <ellipse
              cx={cyl.cx} cy={cyl.topY} rx={cyl.rx} ry={cyl.ry}
              fill="none" stroke="white" strokeOpacity={0.13} strokeWidth={0.6}
            />
          </g>
        </motion.svg>
      </AnimatePresence>
    </div>
  );
};

export default BodySVG;
