import type { CSSProperties } from 'react';
import './LandingPhoneMock.css';

function outerRadiusForWidth(w: number) {
  return Math.round(40 * (w / 210));
}

export type LandingPhoneMockProps = {
  h?: number;
  w?: number;
  label?: string;
  dim?: boolean;
  shrink?: number;
  mt?: number;
  zIndex?: number;
  /** Внутренний отступ рамки вокруг скриншота (px) */
  screenPadding?: number;
  src?: string;
  icon?: string;
  caption?: string;
};

export default function LandingPhoneMock({
  h = 460,
  w = 210,
  label,
  src,
  icon,
  caption,
  dim = false,
  shrink = 1,
  mt = 0,
  zIndex = 1,
  screenPadding = 10,
}: LandingPhoneMockProps) {
  const outerR = outerRadiusForWidth(w);
  const innerR = Math.max(10, outerR - Math.round(screenPadding * 0.85));

  const wrapStyle: CSSProperties = {
    opacity: dim ? 0.5 : 1,
    transform: `scale(${shrink})`,
    transformOrigin: 'bottom center',
    marginTop: mt,
    zIndex,
  };

  if (src) {
    return (
      <div className="lpm-wrap" style={wrapStyle}>
        <div
          className="lpm-device"
          style={{
            width: w,
            height: h,
            borderRadius: outerR,
          }}
        >
          <div
            className="lpm-inset"
            style={{
              padding: screenPadding,
              borderRadius: outerR,
            }}
          >
            <div className="lpm-clip" style={{ borderRadius: innerR }}>
              <img
                src={src}
                alt={label || caption || 'Скриншот Vervel'}
                className="lpm-img"
                draggable={false}
              />
            </div>
          </div>
        </div>
        {label ? <span className="lpm-label">{label}</span> : null}
      </div>
    );
  }

  return (
    <div className="lpm-wrap" style={wrapStyle}>
      <div
        className="lpm-device"
        style={{
          width: w,
          height: h,
          borderRadius: outerR,
        }}
      >
        <div
          className="lpm-island"
          style={{
            width: Math.round(w * 0.42),
            height: Math.round(h * 0.052),
          }}
        />
        <div className="lpm-placeholder">
          {icon ? <div className="lpm-icon">{icon}</div> : null}
          {caption ? <span className="lpm-caption">{caption}</span> : null}
        </div>
      </div>
      {label ? <span className="lpm-label">{label}</span> : null}
    </div>
  );
}
