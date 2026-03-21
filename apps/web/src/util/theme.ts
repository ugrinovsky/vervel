export const DEFAULT_HUE = 175;

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

export type SpecialTheme = 'dark' | 'light';

const TAILWIND_FAMILIES = ['emerald', 'teal', 'green', 'amber', 'orange'];

const ACCENT_SHADES: Record<string, [number, number]> = {
  '100': [65, 92], '200': [70, 82], '300': [68, 72], '400': [68, 55],
  '500': [78, 40], '600': [82, 31], '700': [84, 23], '800': [80, 17], '900': [75, 13],
};

/** Apply a single accent hue to all Tailwind color families.
 *  lightnessBoost / satMult adjust the scale — use for light theme to avoid vivid/heavy shades. */
function applyAccentTailwindColors(root: HTMLElement, accentHue: number, lightnessBoost = 0, satMult = 1) {
  for (const [shade, [sat, light]] of Object.entries(ACCENT_SHADES)) {
    const rgb = `rgb(${hslToRgb(accentHue, sat * satMult, Math.min(light + lightnessBoost, 94))})`;
    for (const family of TAILWIND_FAMILIES) {
      root.style.setProperty(`--color-${family}-${shade}`, rgb);
    }
  }
}

const DARK_ACCENT_HUE = 172;  // matches --color_primary_light teal in dark theme
const LIGHT_ACCENT_HUE = 215; // dusty blue accent for light theme

export function applySpecialTheme(type: SpecialTheme) {
  const root = document.documentElement;
  if (type === 'light') {
    // Boost lightness + reduce saturation so shades aren't too vivid on white background
    applyAccentTailwindColors(root, LIGHT_ACCENT_HUE, 12, 0.6);
  } else {
    applyAccentTailwindColors(root, DARK_ACCENT_HUE, 0, 1);
  }

  if (type === 'dark') {
    root.removeAttribute('data-theme');
    root.style.setProperty('--color_primary', 'rgb(22, 22, 28)');
    root.style.setProperty('--color_primary_dark', 'rgb(12, 12, 16)');
    root.style.setProperty('--color_primary_light', 'rgb(42, 168, 152)');
    root.style.setProperty('--color_primary_icon', 'rgb(72, 198, 182)');
    root.style.setProperty('--color_primary_ch', '22 22 28');
    root.style.setProperty('--color_primary_dark_ch', '12 12 16');
    root.style.setProperty('--color_primary_light_ch', '42 168 152');
    root.style.setProperty('--color_bg_screen', 'radial-gradient(circle at 50% 52.5%, rgb(22, 22, 28) 0%, rgb(12, 12, 16) 90%)');
    root.style.setProperty('--color_bg_card', 'rgba(255, 255, 255, 0.07)');
    root.style.setProperty('--color_bg_card_hover', 'rgba(255, 255, 255, 0.11)');
    root.style.setProperty('--color_bg_input', 'rgba(255, 255, 255, 0.08)');
    root.style.setProperty('--color_border', 'rgba(255, 255, 255, 0.12)');
    root.style.setProperty('--color_border_light', 'rgba(255, 255, 255, 0.08)');
    root.style.setProperty('--color_text_primary', 'rgba(255, 255, 255, 1)');
    root.style.setProperty('--color_text_secondary', 'rgba(255, 255, 255, 0.9)');
    root.style.setProperty('--color_text_muted', 'rgba(255, 255, 255, 0.7)');
  } else {
    root.setAttribute('data-theme', 'light');
    root.style.setProperty('--color_primary', 'rgb(246, 246, 246)');
    root.style.setProperty('--color_primary_dark', 'rgb(236, 236, 236)');
    root.style.setProperty('--color_primary_light', 'rgb(75, 120, 175)');
    root.style.setProperty('--color_primary_icon', 'rgb(58, 100, 155)');
    root.style.setProperty('--color_primary_ch', '246 246 246');
    root.style.setProperty('--color_primary_dark_ch', '236 236 236');
    root.style.setProperty('--color_primary_light_ch', '75 120 175');
    root.style.setProperty('--color_bg_screen', 'rgb(244, 243, 241)');
    root.style.setProperty('--color_bg_card', 'rgb(255, 255, 255)');
    root.style.setProperty('--color_bg_card_hover', 'rgb(248, 248, 248)');
    root.style.setProperty('--color_bg_input', 'rgb(255, 255, 255)');
    root.style.setProperty('--color_border', 'rgba(0, 0, 0, 0.1)');
    root.style.setProperty('--color_border_light', 'rgba(0, 0, 0, 0.07)');
    root.style.setProperty('--color_text_primary', 'rgba(0, 0, 0, 0.88)');
    root.style.setProperty('--color_text_secondary', 'rgba(0, 0, 0, 0.72)');
    root.style.setProperty('--color_text_muted', 'rgba(0, 0, 0, 0.48)');
  }

  document.dispatchEvent(new CustomEvent('themechange'));
}

const SPECIAL_THEME_PROPS = [
  '--color_bg_card', '--color_bg_card_hover', '--color_bg_input',
  '--color_border', '--color_border_light',
  '--color_text_primary', '--color_text_secondary', '--color_text_muted',
] as const;

export function applyTheme(hue: number) {
  const root = document.documentElement;
  // Clear any special-theme overrides so :root CSS fallbacks take effect
  root.removeAttribute('data-theme');
  for (const prop of SPECIAL_THEME_PROPS) root.style.removeProperty(prop);
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

  // Update Safari/Chrome browser UI color
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  const [r, g, b] = primaryDark.split(' ').map(Number);
  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', hex);
  }

  document.dispatchEvent(new CustomEvent('themechange'));
}

export function initTheme() {
  applyTheme(DEFAULT_HUE);
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
