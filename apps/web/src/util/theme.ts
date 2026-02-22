const THEME_KEY = 'themeHue';
const DEFAULT_HUE = 168;

function hslToRgb(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  const r = Math.round(f(0) * 255);
  const g = Math.round(f(8) * 255);
  const b = Math.round(f(4) * 255);
  return `${r} ${g} ${b}`;
}

export function applyTheme(hue: number) {
  const root = document.documentElement;
  const h = hue;
  const hLight = ((h - 8) + 360) % 360;
  const hDark = (h + 26) % 360;

  const primary = hslToRgb(h, 74, 21);
  const primaryDark = hslToRgb(hDark, 67, 17);
  // Optimized for solid button backgrounds with white text.
  // Perceptual compensation: blue/purple are inherently darker in HSL, need higher L.
  // Yellow/orange are perceptually bright, need lower L to avoid neon.
  const hN = ((hLight % 360) + 360) % 360;
  const lightL =
    hN >= 30 && hN <= 100 ? 38   // yellow/orange: very bright hues, keep low
    : hN >= 100 && hN <= 170 ? 38 // green/teal: reduce to match emerald-500 feel (~39%)
    : hN >= 200 && hN <= 290 ? 50 // blue/purple: perceptually darker, needs higher L
    : 44;                          // red/pink/other: moderate
  const primaryLight = hslToRgb(hLight, 75, lightL);

  // Icon color — brighter than button for visibility on dark backgrounds.
  const iconL =
    hN >= 30 && hN <= 100 ? 58
    : hN >= 100 && hN <= 170 ? 60
    : hN >= 200 && hN <= 290 ? 70
    : 63;
  const primaryIcon = hslToRgb(hLight, 72, iconL);

  // Custom app variables
  root.style.setProperty('--color_primary', `rgb(${primary})`);
  root.style.setProperty('--color_primary_dark', `rgb(${primaryDark})`);
  root.style.setProperty('--color_primary_light', `rgb(${primaryLight})`);
  root.style.setProperty('--color_primary_icon', `rgb(${primaryIcon})`);

  root.style.setProperty('--color_primary_ch', primary);
  root.style.setProperty('--color_primary_dark_ch', primaryDark);
  root.style.setProperty('--color_primary_light_ch', primaryLight);

  root.style.setProperty(
    '--color_bg_screen',
    `radial-gradient(circle at 50% 52.5%, rgb(${primary}) 0%, rgb(${primaryDark}) 90%)`
  );

  // Override Tailwind color families so all emerald/teal/green classes follow theme.
  // [saturation, lightness] — calibrated to match Tailwind's original emerald scale proportions.
  const shades: Record<string, [number, number]> = {
    '100': [65, 92],
    '200': [70, 82],
    '300': [68, 72],
    '400': [68, 55],
    '500': [78, 40],
    '600': [82, 31],
    '700': [84, 23],
    '800': [80, 17],
    '900': [75, 13],
  };

  // All color families follow the theme hue.
  const families: Record<string, number> = {
    emerald: hLight,
    teal: hLight,
    green: hLight,
    amber: hLight,
    orange: hLight,
  };

  for (const [shade, [sat, light]] of Object.entries(shades)) {
    for (const [family, familyHue] of Object.entries(families)) {
      const rgb = `rgb(${hslToRgb(familyHue, sat, light)})`;
      root.style.setProperty(`--color-${family}-${shade}`, rgb);
    }
  }

  document.dispatchEvent(new CustomEvent('themechange'));
}

export function getStoredHue(): number {
  const stored = localStorage.getItem(THEME_KEY);
  return stored ? Number(stored) : DEFAULT_HUE;
}

export function saveHue(hue: number) {
  localStorage.setItem(THEME_KEY, String(hue));
  applyTheme(hue);
}

export function initTheme() {
  applyTheme(getStoredHue());
}

export const THEME_PRESETS = [
  { label: 'Зелёный', hue: 140 },
  { label: 'Мятный', hue: 163 },
  { label: 'Бирюзовый', hue: 175 },
  { label: 'Лазурный', hue: 195 },
  { label: 'Синий', hue: 218 },
  { label: 'Индиго', hue: 248 },
  { label: 'Фиолетовый', hue: 270 },
  { label: 'Сиреневый', hue: 285 },
  { label: 'Розовый', hue: 318 },
  { label: 'Малиновый', hue: 345 },
  { label: 'Коралловый', hue: 8 },
  { label: 'Янтарный', hue: 38 },
];
