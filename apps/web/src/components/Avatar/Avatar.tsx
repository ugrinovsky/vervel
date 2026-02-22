import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import muscleZones from './manZones';

interface BodySVGProps {
  zoneIntensities?: Record<string, number>;
  selectedZone?: string | null;
  onZoneClick?: (zoneName: string) => void;
}

// SVG coordinate space
// Original figure: viewBox 218.465 354.786 281.446 720.395
// Avatar is scaled 0.85 and translated so feet land on cylinder top.
// Transform: translate(53.9, 176.3) scale(0.85) — keeps center at x=359,
//   moves feet (orig y≈1075) to CYL_TOP_Y=1090.
// ViewBox trimmed to remove dead space above scaled figure.
const VIEWBOX = '218.465 445 281.446 740';
const AVATAR_TRANSFORM = 'translate(53.9 169.3) scale(0.85)';

const CYL_CX = 359; // horizontal center (218.465 + 281.446/2)
const CYL_TOP_Y = 1090;
const CYL_BOT_Y = 1168;
const CYL_RX = 132; // near full width of viewBox (281.446/2 ≈ 140)
const CYL_RY = 16;

/** Returns fill color based on intensity [0..1] with a green → amber → red gradient */
function zoneColor(intensity: number, alpha: number): string {
  // 0 → hue 140 (vivid green), 0.5 → hue 48 (amber), 1 → hue 0/360 (red)
  const hue =
    intensity <= 0.5
      ? 140 - intensity * 2 * 92 // 140 → 48 (amber)
      : 48 - (intensity - 0.5) * 2 * 53; // 48 → -5 (~355, red)
  return `hsla(${hue}, 88%, 58%, ${alpha})`;
}

/** Lighter, more opaque variant for zone border stroke */
function zoneStrokeColor(intensity: number): string {
  const hue =
    intensity <= 0.5
      ? 140 - intensity * 2 * 92
      : 48 - (intensity - 0.5) * 2 * 53;
  const alpha = 0.45 + intensity * 0.40; // 0.45 → 0.85
  return `hsla(${hue}, 92%, 72%, ${alpha})`; // L=72% — заметно светлее fill
}

const BodySVG: React.FC<BodySVGProps> = ({
  zoneIntensities = {},
  selectedZone = null,
  onZoneClick,
}) => {
  const [showFill, setShowFill] = useState(false);
  const [drawDone, setDrawDone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowFill(true), 900);
    const t2 = setTimeout(() => setDrawDone(true), 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const getFill = (zoneName: string) => {
    const intensity = zoneIntensities[zoneName] || 0;
    if (intensity <= 0) return 'transparent';
    const isSelected = zoneName === selectedZone;
    // slightly transparent: max alpha ≈ 0.58 (was 0.84)
    return zoneColor(intensity, isSelected ? 0.62 : 0.18 + intensity * 0.4);
  };

  const getGlowFill = (zoneName: string) => {
    const intensity = zoneIntensities[zoneName] || 0;
    if (intensity <= 0) return 'transparent';
    return zoneColor(intensity, 0.42);
  };

  const getOutlineStroke = (zoneName: string) => {
    if (zoneName === selectedZone) return 'rgba(255,255,255,0.75)';
    const intensity = zoneIntensities[zoneName] || 0;
    if (intensity > 0) {
      // filled zones — outlines rendered on fill layer, these just duplicate subtly
      return zoneColor(intensity, 0.15 + intensity * 0.25);
    }
    return 'rgba(255,255,255,0.14)'; // empty zones more visible
  };

  const bodyZone = muscleZones.find((z) => z.name === 'body');
  const muscleZonesWithoutBody = muscleZones.filter((z) => z.name !== 'body');

  return (
    <div className="avatar-wrapper glass relative" style={{ paddingBottom: 0 }}>
      {/* Ambient radial glow behind figure */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: 'inherit',
          background:
            'radial-gradient(ellipse 65% 45% at 50% 22%, rgb(var(--color_primary_light_ch) / 0.09) 0%, transparent 70%)',
        }}
      />

      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={VIEWBOX}
        className="w-full"
        style={{ pointerEvents: 'all', display: 'block' }}
      >
        <defs>
          {/* Soft glow for high-intensity zone fills */}
          <filter id="av-zone-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix in="blur" type="saturate" values="1.8" result="sat" />
            <feMerge>
              <feMergeNode in="sat" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Subtle glow for body outline */}
          <filter id="av-outline-glow" x="-12%" y="-8%" width="124%" height="116%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* ── Cylinder gradients ── */}
          {/* Body: dark on sides, light in the middle (lighting from slightly left-center) */}
          <linearGradient id="av-cyl-body" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop
              offset="0%"
              style={{ stopColor: 'var(--color_primary_dark)', stopOpacity: 0.65 }}
            />
            <stop
              offset="18%"
              style={{ stopColor: 'var(--color_primary_light)', stopOpacity: 0.18 }}
            />
            <stop
              offset="40%"
              style={{ stopColor: 'var(--color_primary_light)', stopOpacity: 0.06 }}
            />
            <stop
              offset="68%"
              style={{ stopColor: 'var(--color_primary_light)', stopOpacity: 0.14 }}
            />
            <stop
              offset="100%"
              style={{ stopColor: 'var(--color_primary_dark)', stopOpacity: 0.6 }}
            />
          </linearGradient>

          {/* Top face: lit from top-left */}
          <linearGradient id="av-cyl-top" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop
              offset="0%"
              style={{ stopColor: 'var(--color_primary_light)', stopOpacity: 0.55 }}
            />
            <stop
              offset="45%"
              style={{ stopColor: 'var(--color_primary_light)', stopOpacity: 0.22 }}
            />
            <stop
              offset="100%"
              style={{ stopColor: 'var(--color_primary_dark)', stopOpacity: 0.4 }}
            />
          </linearGradient>

          {/* Specular highlight on top face */}
          <radialGradient id="av-cyl-spec" cx="38%" cy="38%" r="50%">
            <stop offset="0%" style={{ stopColor: 'white', stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: 'white', stopOpacity: 0 }} />
          </radialGradient>

          {/* Bottom ellipse fade */}
          <linearGradient id="av-cyl-bot" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              style={{ stopColor: 'var(--color_primary_dark)', stopOpacity: 0.28 }}
            />
            <stop
              offset="100%"
              style={{ stopColor: 'var(--color_primary_dark)', stopOpacity: 0.06 }}
            />
          </linearGradient>

          {/* Ground shadow */}
          <radialGradient id="av-cyl-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: 'black', stopOpacity: 0.35 }} />
            <stop offset="100%" style={{ stopColor: 'black', stopOpacity: 0 }} />
          </radialGradient>
        </defs>

        {/* ── Avatar figure (scaled + repositioned onto cylinder) ── */}
        <g transform={AVATAR_TRANSFORM}>
          {/* Invisible click hitboxes */}
          {muscleZonesWithoutBody.map((zone) => (
            <g key={`hb-${zone.name}`}>
              {zone.paths.map((path, i) => (
                <path
                  key={i}
                  d={path}
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth="20"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  onClick={() => onZoneClick?.(zone.name)}
                  style={{ cursor: 'pointer', pointerEvents: 'all' }}
                />
              ))}
            </g>
          ))}

          {/* Body outline (drawn with animation) */}
          {bodyZone?.paths.map((path, i) => (
            <motion.path
              key={`body-${i}`}
              d={path}
              fill="none"
              stroke="rgba(176,255,245,0.55)"
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#av-outline-glow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 2.2, ease: 'easeInOut' }}
            />
          ))}

          {/* Zone outline strokes (draw animation) */}
          {muscleZonesWithoutBody.map((zone, zi) => (
            <g key={`zo-${zone.name}`}>
              {zone.paths.map((path, pi) => (
                <motion.path
                  key={pi}
                  d={path}
                  fill="none"
                  stroke={drawDone ? getOutlineStroke(zone.name) : 'rgba(255,255,255,0.07)'}
                  strokeWidth={zone.name === selectedZone ? 1.6 : 0.9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    pathLength: { duration: 0.7, delay: zi * 0.018, ease: 'easeInOut' },
                  }}
                  style={{ pointerEvents: 'none' }}
                />
              ))}
            </g>
          ))}

          {/* Zone fills with glow */}
          {showFill &&
            muscleZonesWithoutBody.map((zone) => {
              const intensity = zoneIntensities[zone.name] || 0;
              const fill = getFill(zone.name);
              if (fill === 'transparent') return null;

              const isHigh = intensity > 0.65;
              const isMedium = intensity > 0.35;
              const glowFill = getGlowFill(zone.name);

              return (
                <g key={`zf-${zone.name}`} style={{ pointerEvents: 'none' }}>
                  {/* Blurred glow layer */}
                  {(isHigh || isMedium) &&
                    zone.paths.map((path, i) => (
                      <motion.path
                        key={`zg-${zone.name}-${i}`}
                        d={path}
                        fill={glowFill}
                        stroke="none"
                        filter="url(#av-zone-glow)"
                        initial={{ opacity: 0 }}
                        animate={isHigh ? { opacity: [0, 0.65, 0.32, 0.65, 0] } : { opacity: 0.38 }}
                        transition={
                          isHigh
                            ? {
                                opacity: {
                                  duration: 2.6,
                                  repeat: Infinity,
                                  ease: 'easeInOut',
                                  delay: 0.4,
                                },
                              }
                            : { duration: 0.65, delay: 0.1 }
                        }
                      />
                    ))}

                  {/* Crisp fill + stroke */}
                  {zone.paths.map((path, i) => (
                    <motion.path
                      key={`zc-${zone.name}-${i}`}
                      d={path}
                      fill={fill}
                      stroke={zoneStrokeColor(intensity)}
                      strokeWidth={1.1}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.55, delay: 0.12 }}
                    />
                  ))}

                  {/* Selected zone — pulsing white stroke */}
                  {zone.name === selectedZone &&
                    zone.paths.map((path, i) => (
                      <motion.path
                        key={`zs-${zone.name}-${i}`}
                        d={path}
                        fill="none"
                        stroke="rgba(255,255,255,0.65)"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{
                          opacity: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                        }}
                        style={{ pointerEvents: 'none' }}
                      />
                    ))}
                </g>
              );
            })}
        </g>
        {/* end avatar transform group */}

        {/* ── Cylinder pedestal ── */}
        <g>
          {/* Ground shadow pool */}
          <ellipse
            cx={CYL_CX}
            cy={CYL_BOT_Y + 10}
            rx={CYL_RX + 16}
            ry={CYL_RY + 2}
            fill="url(#av-cyl-shadow)"
            opacity={0.55}
          />

          {/* Cylinder body (visible front face) */}
          <path
            d={`
              M ${CYL_CX - CYL_RX} ${CYL_TOP_Y}
              L ${CYL_CX - CYL_RX} ${CYL_BOT_Y}
              A ${CYL_RX} ${CYL_RY} 0 0 1 ${CYL_CX + CYL_RX} ${CYL_BOT_Y}
              L ${CYL_CX + CYL_RX} ${CYL_TOP_Y}
            `}
            fill="url(#av-cyl-body)"
            style={{ stroke: 'var(--color_primary_light)', strokeOpacity: 0.12, strokeWidth: 0.5 }}
          />

          {/* Left vertical edge highlight */}
          <line
            x1={CYL_CX - CYL_RX}
            y1={CYL_TOP_Y}
            x2={CYL_CX - CYL_RX}
            y2={CYL_BOT_Y}
            style={{ stroke: 'var(--color_primary_light)', strokeOpacity: 0.55, strokeWidth: 1.8 }}
          />

          {/* Right vertical edge highlight */}
          <line
            x1={CYL_CX + CYL_RX}
            y1={CYL_TOP_Y}
            x2={CYL_CX + CYL_RX}
            y2={CYL_BOT_Y}
            style={{ stroke: 'var(--color_primary_light)', strokeOpacity: 0.55, strokeWidth: 1.8 }}
          />

          {/* Bottom ellipse (partially visible rim) */}
          <ellipse
            cx={CYL_CX}
            cy={CYL_BOT_Y}
            rx={CYL_RX}
            ry={CYL_RY}
            fill="url(#av-cyl-bot)"
            style={{ stroke: 'var(--color_primary_light)', strokeOpacity: 0.18, strokeWidth: 0.8 }}
          />

          {/* Top ellipse — main visible face */}
          <ellipse
            cx={CYL_CX}
            cy={CYL_TOP_Y}
            rx={CYL_RX}
            ry={CYL_RY}
            fill="url(#av-cyl-top)"
            style={{ stroke: 'var(--color_primary_light)', strokeOpacity: 0.62, strokeWidth: 1.6 }}
          />

          {/* Specular reflection on top face */}
          <ellipse
            cx={CYL_CX - 14}
            cy={CYL_TOP_Y - 3}
            rx={CYL_RX * 0.48}
            ry={CYL_RY * 0.48}
            fill="url(#av-cyl-spec)"
          />

          {/* Subtle rim shine line */}
          <ellipse
            cx={CYL_CX}
            cy={CYL_TOP_Y}
            rx={CYL_RX}
            ry={CYL_RY}
            fill="none"
            stroke="white"
            strokeOpacity={0.13}
            strokeWidth={0.6}
          />
        </g>
      </svg>
    </div>
  );
};

export default BodySVG;
