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
  const primaryLight = hslToRgb(hLight, 84, 39);

  // Custom app variables
  root.style.setProperty('--color_primary', `rgb(${primary})`);
  root.style.setProperty('--color_primary_dark', `rgb(${primaryDark})`);
  root.style.setProperty('--color_primary_light', `rgb(${primaryLight})`);

  root.style.setProperty('--color_primary_ch', primary);
  root.style.setProperty('--color_primary_dark_ch', primaryDark);
  root.style.setProperty('--color_primary_light_ch', primaryLight);

  root.style.setProperty(
    '--color_bg_screen',
    `radial-gradient(circle at 50% 52.5%, rgb(${primary}) 0%, rgb(${primaryDark}) 90%)`
  );

  // Override Tailwind color families so all emerald/teal/green classes follow theme
  // [saturation, lightness] — light shades (100-400) are bright for readability on dark bg
  const shades: Record<string, [number, number]> = {
    '100': [70, 95],
    '200': [75, 88],
    '300': [70, 78],
    '400': [60, 68],
    '500': [75, 55],
    '600': [80, 45],
    '700': [85, 35],
    '800': [80, 25],
    '900': [75, 18],
  };

  // Map color families to hue offsets from the base theme hue
  const families: Record<string, number> = {
    emerald: hLight,
    teal: hLight,
    green: hLight,
    yellow: (hLight + 40) % 360,
    orange: (hLight + 60) % 360,
  };

  for (const [shade, [sat, light]] of Object.entries(shades)) {
    for (const [family, familyHue] of Object.entries(families)) {
      const rgb = `rgb(${hslToRgb(familyHue, sat, light)})`;
      root.style.setProperty(`--color-${family}-${shade}`, rgb);
    }
  }
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
  { label: 'Бирюзовый', hue: 168 },
  { label: 'Синий', hue: 220 },
  { label: 'Фиолетовый', hue: 270 },
  { label: 'Розовый', hue: 330 },
  { label: 'Красный', hue: 0 },
  { label: 'Оранжевый', hue: 25 },
  { label: 'Жёлтый', hue: 50 },
  { label: 'Зелёный', hue: 140 },
];
