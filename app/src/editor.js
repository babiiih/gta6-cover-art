// Neon Vice editor: state, photo loading, panel editing and PNG export.
//
// Photos are read from the visitor's own machine with object URLs and drawn
// to the canvas on this page only — nothing is uploaded anywhere. Shot mode
// (?shot=cover / ?shot=editor) builds a fixed scene from the bundled sample
// photos so screenshots are reproducible.

import { LAYOUT_TEMPLATES, layoutById, panelsForSize, pointInPolygon } from './panels.js';
import { COLOR_GRADES, renderCover } from './render.js';

export const EXPORT_SIZES = [
  { id: '1080x1080', label: 'Square 1080 x 1080', width: 1080, height: 1080 },
  { id: '1080x1350', label: 'Portrait 1080 x 1350', width: 1080, height: 1350 },
  { id: '1920x1080', label: 'Landscape 1920 x 1080', width: 1920, height: 1080 },
];

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');

const state = {
  layout: layoutById('hero'),
  panels: [],
  photos: [],
  photoNames: [],
  selectedPanel: 0,
  grade: 'vice',
  gradeIntensity: 0.8,
  caption: 'Neon Vice',
  subtitle: 'Six stars. One city.',
  exportSize: EXPORT_SIZES[1],
};

function freshPanel(photoIndex) {
  return { photoIndex, offsetX: 0, offsetY: 0, zoom: 1, fitMode: 'fill' };
}

/** Rebuilds the per-panel placements for the current layout, keeping edits where a panel survives. */
function syncPanelsToLayout() {
  const count = state.layout.panels.length;
  const next = [];
  for (let i = 0; i < count; i++) {
    const kept = state.panels[i];
    if (kept) { next.push(kept); continue; }
    next.push(freshPanel(state.photos.length ? i % state.photos.length : 0));
  }
  state.panels = next;
  state.selectedPanel = Math.min(state.selectedPanel, count - 1);
}

function currentSize() {
  return { width: state.exportSize.width, height: state.exportSize.height };
}

export function redraw() {
  const { width, height } = currentSize();
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  renderCover(ctx, state, width, height, { showSelection: !document.body.classList.contains('shot-cover') });
  refreshPanelControls();
}

// ---------------------------------------------------------------- photos

export function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function addPhotoFiles(fileList) {
  const files = [...fileList].filter((f) => f.type.startsWith('image/'));
  for (const file of files) {
    const url = URL.createObjectURL(file);
    const img = await loadImageFromUrl(url);
    state.photos.push(img);
    state.photoNames.push(file.name);
  }
  if (files.length) {
    state.panels.forEach((p, i) => { if (i < state.photos.length) p.photoIndex = i % state.photos.length; });
    setStatus(`${state.photos.length} photo${state.photos.length === 1 ? '' : 's'} loaded. Click a panel, then drag on the cover to frame it.`);
  }
  buildPhotoPicker();
  redraw();
}

function buildPhotoPicker() {
  const picker = document.getElementById('panel-photo');
  picker.innerHTML = '';
  state.photoNames.forEach((name, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `Photo ${i + 1} — ${name}`;
    picker.appendChild(opt);
  });
  if (!state.photoNames.length) {
    const opt = document.createElement('option');
    opt.value = '0';
    opt.textContent = 'No photo yet';
    picker.appendChild(opt);
  }
  const placement = state.panels[state.selectedPanel];
  if (placement) picker.value = String(Math.min(placement.photoIndex, Math.max(0, state.photos.length - 1)));
}

// ---------------------------------------------------------------- controls

function setStatus(text) {
  document.getElementById('status').textContent = text;
}

function refreshPanelControls() {
  const placement = state.panels[state.selectedPanel];
  if (!placement) return;
  document.getElementById('selected-label').textContent =
    `Panel ${state.selectedPanel + 1} of ${state.panels.length}: ${state.layout.panels[state.selectedPanel].name}`;
  document.getElementById('zoom').value = String(placement.zoom);
  document.getElementById('fit-toggle').textContent = placement.fitMode === 'fill' ? 'Fill panel (click for Fit)' : 'Fit whole photo (click for Fill)';
  const picker = document.getElementById('panel-photo');
  if (picker.options.length) picker.value = String(Math.min(placement.photoIndex, picker.options.length - 1));
}

function buildLayoutButtons() {
  const wrap = document.getElementById('layout-buttons');
  for (const template of LAYOUT_TEMPLATES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = template.label;
    btn.dataset.layoutId = template.id;
    btn.classList.toggle('active', template.id === state.layout.id);
    btn.addEventListener('click', () => {
      state.layout = template;
      syncPanelsToLayout();
      wrap.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.layoutId === template.id));
      redraw();
    });
    wrap.appendChild(btn);
  }
}

function buildGradeButtons() {
  const wrap = document.getElementById('grade-buttons');
  for (const grade of COLOR_GRADES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = grade.label;
    btn.dataset.gradeId = grade.id;
    btn.classList.toggle('active', grade.id === state.grade);
    btn.addEventListener('click', () => {
      state.grade = grade.id;
      wrap.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.gradeId === grade.id));
      redraw();
    });
    wrap.appendChild(btn);
  }
}

function buildSizePicker() {
  const picker = document.getElementById('export-size');
  for (const size of EXPORT_SIZES) {
    const opt = document.createElement('option');
    opt.value = size.id;
    opt.textContent = size.label;
    picker.appendChild(opt);
  }
  picker.value = state.exportSize.id;
  picker.addEventListener('change', () => {
    state.exportSize = EXPORT_SIZES.find((s) => s.id === picker.value) ?? EXPORT_SIZES[0];
    redraw();
  });
}

function wireControls() {
  const fileInput = document.getElementById('photo-files');
  fileInput.addEventListener('change', () => addPhotoFiles(fileInput.files ?? []));

  const dropZone = document.getElementById('drop-zone');
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragging'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragging');
    if (e.dataTransfer) addPhotoFiles(e.dataTransfer.files);
  });

  document.getElementById('caption').addEventListener('input', (e) => { state.caption = e.target.value; redraw(); });
  document.getElementById('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  document.getElementById('grade-intensity').addEventListener('input', (e) => { state.gradeIntensity = Number(e.target.value); redraw(); });
  document.getElementById('zoom').addEventListener('input', (e) => {
    const placement = state.panels[state.selectedPanel];
    if (placement) placement.zoom = Number(e.target.value);
    redraw();
  });
  document.getElementById('panel-photo').addEventListener('change', (e) => {
    const placement = state.panels[state.selectedPanel];
    if (placement) placement.photoIndex = Number(e.target.value);
    redraw();
  });
  document.getElementById('fit-toggle').addEventListener('click', () => {
    const placement = state.panels[state.selectedPanel];
    if (placement) placement.fitMode = placement.fitMode === 'fill' ? 'fit' : 'fill';
    redraw();
  });
  document.getElementById('reset-panel').addEventListener('click', () => {
    const placement = state.panels[state.selectedPanel];
    if (placement) { placement.offsetX = 0; placement.offsetY = 0; placement.zoom = 1; }
    redraw();
  });
  document.getElementById('export').addEventListener('click', exportPng);
}

function exportPng() {
  const { width, height } = currentSize();
  const off = document.createElement('canvas');
  off.width = width;
  off.height = height;
  renderCover(off.getContext('2d'), state, width, height, { showSelection: false });
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-vice-${width}x${height}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    setStatus(`Saved neon-vice-${width}x${height}.png`);
  }, 'image/png');
}

// ---------------------------------------------------------------- canvas pointer work

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const { width, height } = currentSize();
  return [
    ((event.clientX - rect.left) / rect.width) * width,
    ((event.clientY - rect.top) / rect.height) * height,
  ];
}

function panelIndexAt(x, y) {
  const { width, height } = currentSize();
  const panels = panelsForSize(state.layout, width, height);
  for (let i = panels.length - 1; i >= 0; i--) {
    if (pointInPolygon(x, y, panels[i].points)) return i;
  }
  return -1;
}

let drag = null;

function wireCanvasPointer() {
  canvas.addEventListener('pointerdown', (event) => {
    const [x, y] = canvasPoint(event);
    const index = panelIndexAt(x, y);
    if (index >= 0) state.selectedPanel = index;
    const placement = state.panels[state.selectedPanel];
    if (!placement) return;
    drag = { lastX: x, lastY: y, placement };
    canvas.setPointerCapture(event.pointerId);
    redraw();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const [x, y] = canvasPoint(event);
    drag.placement.offsetX += x - drag.lastX;
    drag.placement.offsetY += y - drag.lastY;
    drag.lastX = x;
    drag.lastY = y;
    redraw();
  });
  const endDrag = () => { drag = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
}

// ---------------------------------------------------------------- shot mode

async function applyShotMode(query) {
  const shot = query.get('shot');
  if (!shot) return false;
  const sampleName = query.get('photo') ?? 'pier';
  const otherName = sampleName === 'pier' ? 'boulevard' : 'pier';
  const first = await loadImageFromUrl(`samples/${sampleName}.jpg`);
  const second = await loadImageFromUrl(`samples/${otherName}.jpg`);
  state.photos = [first, second];
  state.photoNames = [`${sampleName}.jpg`, `${otherName}.jpg`];
  state.caption = query.get('caption') ?? 'Neon Vice';
  state.subtitle = query.get('subtitle') ?? 'Six stars. One city.';
  if (query.get('layout')) state.layout = layoutById(query.get('layout'));
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('size')) {
    const size = EXPORT_SIZES.find((s) => s.id === query.get('size'));
    if (size) state.exportSize = size;
  }
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    if (!query.get('size')) state.exportSize = EXPORT_SIZES[1];
  } else {
    document.body.classList.add('shot-editor');
    if (!query.get('size')) state.exportSize = EXPORT_SIZES[1];
    document.getElementById('caption').value = state.caption;
    document.getElementById('subtitle').value = state.subtitle;
  }
  syncPanelsToLayout();
  state.panels.forEach((p, i) => { p.photoIndex = i % state.photos.length; });
  buildPhotoPicker();
  try { await document.fonts.load('80px Anton'); await document.fonts.ready; } catch { /* fall back to sans */ }
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
  return true;
}

// ---------------------------------------------------------------- boot

async function boot() {
  buildLayoutButtons();
  buildGradeButtons();
  buildSizePicker();
  wireControls();
  wireCanvasPointer();
  syncPanelsToLayout();
  const query = new URLSearchParams(location.search);
  const isShot = await applyShotMode(query);
  if (!isShot) {
    try { await document.fonts.load('80px Anton'); } catch { /* fall back to sans */ }
    buildPhotoPicker();
    redraw();
  }
}

boot();
