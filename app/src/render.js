// Cover renderer for Neon Vice: panels, colour grades and caption lettering.
//
// renderCover draws the whole cover onto any 2D context at that canvas's own
// size, so the editor preview and the exported PNG share one code path. The
// editor passes showSelection=true for the preview only; exports never draw
// the selection outline.

import { panelsForSize, insetPolygon, polygonBounds } from './panels.js';

export const COLOR_GRADES = [
  {
    id: 'vice',
    label: 'Vice Sunset',
    veil: '#ff5e8a',
    stops: [[0, 'rgba(255, 94, 138, 0.34)'], [0.45, 'rgba(255, 150, 60, 0.10)'], [1, 'rgba(120, 30, 140, 0.38)']],
  },
  {
    id: 'neon',
    label: 'Neon Nights',
    veil: '#3150ff',
    stops: [[0, 'rgba(30, 40, 160, 0.42)'], [0.5, 'rgba(0, 200, 255, 0.10)'], [1, 'rgba(200, 30, 160, 0.40)']],
  },
  {
    id: 'miami',
    label: 'Miami Day',
    veil: '#ffe9a8',
    stops: [[0, 'rgba(110, 210, 255, 0.20)'], [0.55, 'rgba(255, 255, 220, 0.06)'], [1, 'rgba(255, 170, 90, 0.22)']],
  },
  {
    id: 'noir',
    label: 'Noir Dusk',
    veil: '#3a3f4a',
    stops: [[0, 'rgba(16, 18, 28, 0.46)'], [0.5, 'rgba(60, 64, 80, 0.14)'], [1, 'rgba(4, 4, 10, 0.58)']],
  },
];

export function gradeById(id) {
  return COLOR_GRADES.find((g) => g.id === id) ?? COLOR_GRADES[0];
}

function tracePath(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

/**
 * Draws one photo inside one panel. The photo is scaled to fill the panel's
 * bounding box (or fit inside it, in 'fit' mode), multiplied by the panel's
 * zoom, then shifted by the panel's pan offsets. The panel polygon clips it,
 * so the slanted edges stay clean whatever the photo does.
 */
export function drawPanelPhoto(ctx, panelPoints, placement, photo) {
  const bounds = polygonBounds(panelPoints);
  ctx.save();
  tracePath(ctx, panelPoints);
  ctx.clip();
  ctx.fillStyle = '#14101f';
  ctx.fillRect(bounds.minX, bounds.minY, bounds.width, bounds.height);
  if (photo) {
    const iw = photo.naturalWidth || photo.width;
    const ih = photo.naturalHeight || photo.height;
    const fillScale = Math.max(bounds.width / iw, bounds.height / ih);
    const fitScale = Math.min(bounds.width / iw, bounds.height / ih);
    const base = placement.fitMode === 'fit' ? fitScale : fillScale;
    const scale = base * (placement.zoom || 1);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = bounds.minX + (bounds.width - dw) / 2 + (placement.offsetX || 0);
    const dy = bounds.minY + (bounds.height - dh) / 2 + (placement.offsetY || 0);
    ctx.drawImage(photo, dx, dy, dw, dh);
  }
  ctx.restore();
}

/**
 * Lays the chosen colour grade over the finished panels: a soft 'overlay'
 * veil in the grade's tint, its top-to-bottom gradient, and a vignette that
 * darkens the corners. Every alpha is scaled by the intensity slider (0..1).
 */
export function applyColorGrade(ctx, grade, intensity, w, h) {
  if (intensity <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.45 * intensity;
  ctx.fillStyle = grade.veil;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, colour] of grade.stops) gradient.addColorStop(at, colour);
  ctx.save();
  ctx.globalAlpha = intensity;
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, `rgba(0, 0, 0, ${0.36 * intensity})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

/** Fits a font size so `text` spans at most maxWidth, shrinking from startSize. */
function fitFontSize(ctx, text, startSize, maxWidth, weightPrefix) {
  let size = startSize;
  ctx.font = `${weightPrefix}${size}px Anton, sans-serif`;
  while (ctx.measureText(text).width > maxWidth && size > 14) {
    size -= 2;
    ctx.font = `${weightPrefix}${size}px Anton, sans-serif`;
  }
  return size;
}

/**
 * Draws the caption block near the foot of the cover: the main caption in
 * Anton with a dark outline stroke, a warm gradient fill and a drop shadow,
 * and the subtitle underneath in spaced capitals. A soft dark band behind the
 * words keeps them readable over busy photos.
 */
export function drawCaptionLettering(ctx, caption, subtitle, w, h) {
  const main = (caption || '').trim().toUpperCase();
  const sub = (subtitle || '').trim().toUpperCase();
  if (!main && !sub) return;

  const bandTop = h * 0.70;
  const band = ctx.createLinearGradient(0, bandTop, 0, h);
  band.addColorStop(0, 'rgba(5, 4, 12, 0)');
  band.addColorStop(0.45, 'rgba(5, 4, 12, 0.55)');
  band.addColorStop(1, 'rgba(5, 4, 12, 0.82)');
  ctx.fillStyle = band;
  ctx.fillRect(0, bandTop, w, h - bandTop);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (main) {
    const size = fitFontSize(ctx, main, h * 0.115, w * 0.92, '');
    const baseline = sub ? h * 0.885 : h * 0.915;
    const fill = ctx.createLinearGradient(0, baseline - size, 0, baseline);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(0.55, '#ffd9ec');
    fill.addColorStop(1, '#ffb347');
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = size * 0.16;
    ctx.shadowOffsetY = size * 0.05;
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.14;
    ctx.strokeStyle = '#160a24';
    ctx.strokeText(main, w / 2, baseline);
    ctx.fillStyle = fill;
    ctx.fillText(main, w / 2, baseline);
    ctx.restore();
  }
  if (sub) {
    const size = fitFontSize(ctx, sub, h * 0.034, w * 0.86, '');
    ctx.save();
    try { ctx.letterSpacing = `${Math.round(size * 0.32)}px`; } catch { /* older engines: spacing is a nicety */ }
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = size * 0.3;
    ctx.fillStyle = '#ffe9f4';
    ctx.fillText(sub, w / 2, h * 0.945);
    ctx.restore();
  }
}

/**
 * Renders the full cover described by `state` onto ctx at w x h.
 * state: { layout, panels: [{photoIndex, offsetX, offsetY, zoom, fitMode}],
 *          photos: [image...], grade, gradeIntensity, caption, subtitle }
 */
export function renderCover(ctx, state, w, h, options = {}) {
  ctx.fillStyle = '#07060d';
  ctx.fillRect(0, 0, w, h);

  const gap = Math.max(3, Math.round(w * 0.006));
  const panels = panelsForSize(state.layout, w, h);
  panels.forEach((panelDef, index) => {
    const points = insetPolygon(panelDef.points, gap);
    const placement = state.panels[index] ?? { photoIndex: index, offsetX: 0, offsetY: 0, zoom: 1, fitMode: 'fill' };
    const photo = state.photos[placement.photoIndex] ?? state.photos[0] ?? null;
    drawPanelPhoto(ctx, points, placement, photo);
    if (options.showSelection && index === state.selectedPanel) {
      ctx.save();
      tracePath(ctx, points);
      ctx.lineWidth = Math.max(3, w * 0.005);
      ctx.strokeStyle = '#22d3ee';
      ctx.stroke();
      ctx.restore();
    }
  });

  applyColorGrade(ctx, gradeById(state.grade), state.gradeIntensity, w, h);
  drawCaptionLettering(ctx, state.caption, state.subtitle, w, h);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
}
