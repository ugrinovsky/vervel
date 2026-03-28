import type { ProfileData } from '@/api/profile';
import type { LeaderboardEntry } from '@/api/trainer';

// ─── Canvas helpers ────────────────────────────────────────────────────────

function font(size: number, weight = 400): string {
  return `${weight} ${size}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  if (w <= 0) return;
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Read a CSS channel variable like "16 185 129" and return rgba() string */
function rgba(channelVar: string, alpha: number): string {
  const ch = getComputedStyle(document.documentElement)
    .getPropertyValue(channelVar).trim(); // e.g. "16 185 129"
  const [r, g, b] = ch.split(' ').map(Number);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Read a full CSS color variable (rgb/hex) as-is */
function cssColor(varName: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

/** Read a full CSS color variable like "rgb(16 185 129)" and apply alpha → rgba() */
function cssColorAlpha(varName: string, alpha: number): string {
  const raw = cssColor(varName); // e.g. "rgb(16 185 129)"
  const nums = raw.match(/[\d.]+/g);
  if (!nums || nums.length < 3) return `rgba(0,0,0,${alpha})`;
  return `rgba(${nums[0]},${nums[1]},${nums[2]},${alpha})`;
}

function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const primary     = cssColor('--color_primary');
  const primaryDark = cssColor('--color_primary_dark');
  const bg = ctx.createRadialGradient(W / 2, H * 0.25, 0, W / 2, H * 0.25, H * 0.85);
  bg.addColorStop(0, primary);
  bg.addColorStop(1, primaryDark);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = cssColor('--color_primary_light');
  ctx.fillRect(0, 0, W, 6);
}

function drawDivider(ctx: CanvasRenderingContext2D, y: number, x1: number, x2: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  initials: string,
  cx: number, cy: number, r: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  if (img) {
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = rgba('--color_primary_light_ch', 0.2);
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.restore();
  if (!img) {
    ctx.save();
    ctx.font = font(r * 0.72, 700);
    ctx.fillStyle = cssColor('--color_primary_light');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials.slice(0, 2), cx, cy);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }
}

function getInitials(name: string | null): string {
  return (name || '?')
    .split(' ').slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '').join('');
}

// ─── Share / print ─────────────────────────────────────────────────────────

function printBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const win = window.open('', '_blank');
  if (!win) { URL.revokeObjectURL(url); return; }
  win.document.write(`<html><head><title>Vervel</title>
    <style>*{margin:0;padding:0}body{background:#000;display:flex;justify-content:center;align-items:center;min-height:100vh}img{max-height:100vh;max-width:100%;display:block}@media print{body{background:transparent}}</style>
    </head><body><img src="${url}" onload="window.print();window.close();"/></body></html>`);
  win.document.close();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function shareCanvas(canvas: HTMLCanvasElement): Promise<void> {
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return;
  const file = new File([blob], 'vervel.png', { type: 'image/png' });
  if (navigator.share && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Vervel' });
      return;
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
    }
  }
  printBlob(blob);
}

// ─── Profile card (540 × 960) ──────────────────────────────────────────────

export async function drawProfileCard(canvas: HTMLCanvasElement, d: ProfileData) {
  const W = 540, H = 960, PAD = 52;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const accent = cssColor('--color_primary_light');

  drawBackground(ctx, W, H);

  // VERVEL label
  ctx.font = font(18, 700);
  ctx.fillStyle = accent;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('VERVEL', W - PAD, 54);

  // Avatar
  const AVR = 40;
  const avCX = PAD + AVR, avCY = 104;
  let avatarImg: HTMLImageElement | null = null;
  if (d.user.photoUrl) {
    try { avatarImg = await loadImage(d.user.photoUrl); } catch { /* skip */ }
  }
  drawAvatar(ctx, avatarImg, getInitials(d.user.fullName), avCX, avCY, AVR);

  // Name + level
  const nameX = PAD + AVR * 2 + 16;
  ctx.font = font(32, 700);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.fillText(d.user.fullName || 'Атлет', nameX, 92);
  ctx.font = font(19, 400);
  ctx.fillStyle = accent;
  ctx.fillText(`Lv ${d.stats.level}  ·  ${d.stats.levelName}`, nameX, 122);

  // Divider
  drawDivider(ctx, 152, PAD, W - PAD);

  // Stats grid 2 × N
  const volumeLabel = d.stats.totalVolume >= 1_000_000
    ? `${(d.stats.totalVolume / 1_000_000).toFixed(1)} тт`
    : d.stats.totalVolume >= 1_000
      ? `${(d.stats.totalVolume / 1_000).toFixed(1)} т`
      : `${d.stats.totalVolume ?? 0} кг`;

  const grid = [
    { label: 'XP',             value: d.stats.xp.toLocaleString() },
    { label: 'Тренировок',     value: d.stats.totalWorkouts.toLocaleString() },
    { label: 'Серия',          value: `${d.stats.streak} нед` },
    { label: 'Рекорд серии',   value: `${d.stats.longestStreak} нед` },
    { label: 'Тоннаж',         value: volumeLabel },
    ...(d.stats.avgIntensity != null
      ? [{ label: 'Ср. интенсивность', value: `${d.stats.avgIntensity}%` }]
      : []),
  ];

  const cellW = (W - PAD * 2) / 2;
  const CELL_H = 100;
  const gridTop = 172;

  grid.forEach(({ label, value }, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = PAD + col * cellW;
    const baseY = gridTop + row * CELL_H;
    ctx.font = font(34, 700);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(value, x, baseY + 42);
    ctx.font = font(14, 400);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(label, x, baseY + 62);
  });

  // XP progress bar — fixed distance below last grid row
  const rows = Math.ceil(grid.length / 2);
  const barY = gridTop + rows * CELL_H + 24;
  const barW = W - PAD * 2;

  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  roundRect(ctx, PAD, barY, barW, 12, 6); ctx.fill();
  const filled = Math.round((d.stats.xpProgressPct / 100) * barW);
  if (filled > 0) {
    ctx.fillStyle = accent;
    roundRect(ctx, PAD, barY, filled, 12, 6); ctx.fill();
  }
  ctx.font = font(13, 400);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.textAlign = 'left';
  ctx.fillText(
    `${d.stats.xp.toLocaleString()} / ${d.stats.xpForNextLevel.toLocaleString()} XP до Lv ${d.stats.level + 1}`,
    PAD, barY + 12 + 22
  );

  // Footer
  ctx.font = font(18, 600);
  ctx.fillStyle = accent;
  ctx.textAlign = 'right';
  ctx.fillText('vervel.ru', W - PAD, H - 44);
}

// ─── Leaderboard card (540 × 960) ──────────────────────────────────────────

const PODIUM_COL_ORDER = [1, 0, 2]; // left=2nd, center=1st, right=3rd
const MEDALS = ['🥇', '🥈', '🥉'];
const PLATFORM_HEIGHTS = [80, 55, 35]; // 1st, 2nd, 3rd

export interface LeaderboardCardData {
  groupName: string;
  trainerName: string | null;
  metricLabel: string;
  periodLabel: string;
  entries: LeaderboardEntry[];  // sorted descending
  format: (v: number | null) => string;
  metric: keyof LeaderboardEntry;
  isTrainer: boolean;
}

export async function drawLeaderboardCard(canvas: HTMLCanvasElement, d: LeaderboardCardData) {
  const W = 540, H = 960, PAD = 48;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const accent = cssColor('--color_primary_light');


  drawBackground(ctx, W, H);

  // ── Header ──
  ctx.font = font(28, 700);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(d.groupName || 'Группа', PAD, 52);

  ctx.font = font(16, 700);
  ctx.fillStyle = accent;
  ctx.textAlign = 'right';
  ctx.fillText('VERVEL', W - PAD, 52);

  ctx.font = font(15, 400);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'left';
  ctx.fillText(`${d.metricLabel}  ·  ${d.periodLabel}`, PAD, 78);

  drawDivider(ctx, 98, PAD, W - PAD);

  // ── Podium ──
  // Layout: 3 cols, each athlete block = medal + avatar + name + value + platform
  // Tallest block (1st, platH=80): medal=32, gap=6, avatar=52, gap=6, name=18, gap=4, value=18, gap=8, plat=80
  // Total height per col = 32+6+52+6+18+4+18+8+80 = 224px
  const colW = (W - PAD * 2) / 3;
  const PLAT_BASE_Y = 98 + 230; // y of platform bottom for all cols = 328
  const ATHLETE_BLOCK_H = 140;  // space above platform for content (medal+avatar+name+value)

  const hasResults =
    d.entries.length > 0 &&
    (d.entries[0]?.[d.metric] ?? null) !== null &&
    Number(d.entries[0]?.[d.metric]) > 0;

  PODIUM_COL_ORDER.forEach((entryIdx, col) => {
    const candidate = d.entries[entryIdx] ?? null;
    const entry = candidate && (candidate[d.metric] != null) && Number(candidate[d.metric]) > 0
      ? candidate : null;
    const rank = entryIdx; // 0=gold, 1=silver, 2=bronze
    const platH = PLATFORM_HEIGHTS[rank];
    const platY = PLAT_BASE_Y - platH;
    const cx = PAD + col * colW + colW / 2;

    // Platform — chart colors matching the line chart (rank 0→chart_1, 1→chart_2, 2→chart_3)
    const platOpacity = [0.65, 0.4, 0.35][rank];
    ctx.fillStyle = cssColorAlpha(`--color_chart_${rank + 1}`, platOpacity);
    roundRect(ctx, PAD + col * colW + 6, platY, colW - 12, platH, 8);
    ctx.fill();

    // Rank number on platform
    ctx.font = font(18, 900);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.textAlign = 'center';
    ctx.fillText(String(rank + 1), cx, platY + platH / 2 + 6);

    // Athlete content above platform
    const contentBottomY = platY - 8; // bottom of content area
    const valueY   = contentBottomY - 4;
    const nameY    = valueY - 22;
    const avatarCY = nameY - 16 - 26; // 26=radius, 16=gap
    const medalY   = avatarCY - 26 - 8; // above avatar

    if (entry) {
      // Medal
      ctx.font = font(26);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(MEDALS[rank], cx, medalY);

      // Avatar circle
      drawAvatar(ctx, null, getInitials(entry.fullName), cx, avatarCY, 26);

      // Name
      ctx.font = font(13, 600);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText((entry.fullName?.split(' ')[0] || 'Атлет').slice(0, 9), cx, nameY);

      // Value
      ctx.font = font(13, 700);
      ctx.fillStyle = cssColor(`--color_chart_${rank + 1}`);
      ctx.textAlign = 'center';
      ctx.fillText(d.format(entry[d.metric] != null ? Number(entry[d.metric]) : null), cx, valueY);
    } else {
      // Empty placeholder
      ctx.globalAlpha = 0.25;
      ctx.font = font(26);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(MEDALS[rank], cx, medalY);
      ctx.font = font(13, 400);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('—', cx, valueY);
      ctx.globalAlpha = 1;
    }
  });

  // ── Top-5 list ──
  const listStartY = PLAT_BASE_Y + 18;
  drawDivider(ctx, listStartY, PAD, W - PAD);

  const ROW_H = 58;
  const top5 = d.entries.slice(0, 5);

  top5.forEach((entry, i) => {
    const rowY = listStartY + 12 + i * ROW_H;
    const val = entry[d.metric];
    const isTop = i === 0 && hasResults;

    // Rank
    ctx.font = font(13, 700);
    ctx.fillStyle = isTop ? accent : 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(i + 1), PAD, rowY + 18);

    // Name
    ctx.font = font(16, 600);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(entry.fullName || 'Атлет', PAD + 28, rowY + 18);

    // Workouts + level subtitle
    ctx.font = font(12, 400);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(`Lv ${entry.level}  ·  ${entry.workouts} трен.`, PAD + 28, rowY + 38);

    // Value
    ctx.font = font(16, 700);
    ctx.fillStyle = isTop ? accent : '#FFFFFF';
    ctx.textAlign = 'right';
    ctx.fillText(d.format(val != null ? Number(val) : null), W - PAD, rowY + 18);
  });

  // ── Trainer line ──
  if (d.trainerName) {
    const trainerY = listStartY + 12 + top5.length * ROW_H + 16;
    drawDivider(ctx, trainerY, PAD, W - PAD);
    ctx.font = font(13, 400);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'left';
    ctx.fillText('Тренер', PAD, trainerY + 28);
    ctx.font = font(15, 600);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(d.trainerName, PAD + 70, trainerY + 28);
  }

  // Footer
  ctx.font = font(18, 600);
  ctx.fillStyle = accent;
  ctx.textAlign = 'right';
  ctx.fillText('vervel.ru', W - PAD, H - 44);
}
