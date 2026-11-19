// Panel layout templates for Neon Vice.
//
// Every template describes its panels as polygons in normalised cover
// coordinates (0..1 on both axes). render.js scales them to the real canvas
// size, so the same template works for square, portrait and landscape covers.
// The slanted shared edges are what give the classic poster-collage look:
// neighbouring panels meet along a diagonal instead of a straight seam.

function panel(name, points) {
  return { name, points };
}

const heroAndStrips = {
  id: 'hero',
  label: 'Hero + angled strips',
  panels: [
    panel('Hero', [[0, 0], [0.66, 0], [0.60, 0.48], [0.56, 1], [0, 1]]),
    panel('Top strip', [[0.66, 0], [1, 0], [1, 0.48], [0.60, 0.48]]),
    panel('Bottom strip', [[0.60, 0.48], [1, 0.48], [1, 1], [0.56, 1]]),
  ],
};

const fivePanelGrid = {
  id: 'grid',
  label: 'Five-panel slanted grid',
  panels: [
    panel('Top left', [[0, 0], [0.52, 0], [0.48, 0.38], [0, 0.42]]),
    panel('Top right', [[0.52, 0], [1, 0], [1, 0.34], [0.48, 0.38]]),
    panel('Middle band', [[0, 0.42], [0.48, 0.38], [1, 0.34], [1, 0.60], [0.46, 0.64], [0, 0.66]]),
    panel('Bottom left', [[0, 0.66], [0.46, 0.64], [0.50, 1], [0, 1]]),
    panel('Bottom right', [[0.46, 0.64], [1, 0.60], [1, 1], [0.50, 1]]),
  ],
};

const triptych = {
  id: 'triptych',
  label: 'Triptych',
  panels: [
    panel('Left', [[0, 0], [0.36, 0], [0.30, 1], [0, 1]]),
    panel('Centre', [[0.36, 0], [0.68, 0], [0.62, 1], [0.30, 1]]),
    panel('Right', [[0.68, 0], [1, 0], [1, 1], [0.62, 1]]),
  ],
};

const magazineSplit = {
  id: 'magazine',
  label: 'Magazine split',
  panels: [
    panel('Headline', [[0, 0], [1, 0], [1, 0.55], [0, 0.62]]),
    panel('Lower left', [[0, 0.62], [0.52, 0.585], [0.48, 1], [0, 1]]),
    panel('Lower right', [[0.52, 0.585], [1, 0.55], [1, 1], [0.48, 1]]),
  ],
};

export const LAYOUT_TEMPLATES = [heroAndStrips, fivePanelGrid, triptych, magazineSplit];

export function layoutById(id) {
  return LAYOUT_TEMPLATES.find((t) => t.id === id) ?? heroAndStrips;
}

/** Scales a template's normalised polygons to pixel points for a w x h cover. */
export function panelsForSize(template, w, h) {
  return template.panels.map((p) => ({
    name: p.name,
    points: p.points.map(([nx, ny]) => [nx * w, ny * h]),
  }));
}

/** The centre of a polygon, used when insetting a panel to draw its divider gap. */
export function polygonCentroid(points) {
  let x = 0;
  let y = 0;
  for (const [px, py] of points) { x += px; y += py; }
  return [x / points.length, y / points.length];
}

/** Moves every corner a few pixels toward the centroid, opening a dark seam between panels. */
export function insetPolygon(points, gapPx) {
  const [cx, cy] = polygonCentroid(points);
  return points.map(([px, py]) => {
    const dx = cx - px;
    const dy = cy - py;
    const dist = Math.hypot(dx, dy) || 1;
    const step = Math.min(gapPx, dist * 0.4);
    return [px + (dx / dist) * step, py + (dy / dist) * step];
  });
}

/** The axis-aligned bounding box of a polygon: the frame a photo is fitted into. */
export function polygonBounds(points) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { minX, minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

/** Ray-casting hit test, used to pick the panel under the pointer. */
export function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
