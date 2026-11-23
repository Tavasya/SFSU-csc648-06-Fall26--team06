/*
 * lib/map/view.js
 *
 * PURPOSE:
 * Pan and zoom math for the 2D Campus Map (R6.5), used by
 * components/map/Map.js and tested on its own (tests/map-view.test.mjs).
 * A view is the visible part of the map in map units: { x, y, w, h }, where
 * h = w * aspect and aspect is the card's height / width.
 */

export const MAX_ZOOM = 6;

// The view that shows the whole map (width W, height H) at this aspect.
export function fullView(aspect, W, H) {
  const w = Math.max(W, H / aspect);
  const h = w * aspect;
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}

// Keeps a view between "whole campus" and MAX_ZOOM, and stops it panning the
// campus out of sight (a view larger than the map is centered instead).
export function clampView(v, aspect, W, H, maxZoom = MAX_ZOOM) {
  const maxW = fullView(aspect, W, H).w;
  const w = Math.min(maxW, Math.max(W / maxZoom, v.w));
  const h = w * aspect;
  const clampAxis = (pos, size, total) =>
    size >= total ? (total - size) / 2 : Math.min(total - size, Math.max(0, pos));
  return { w, h, x: clampAxis(v.x, w, W), y: clampAxis(v.y, h, H) };
}

// Zooms by `factor` (< 1 zooms in) keeping the map point (mx, my) under the
// cursor in place. `clamp` is a view => view function such as clampView.
export function zoomAround(v, factor, mx, my, clamp) {
  const target = clamp({ ...v, w: v.w * factor });
  const k = target.w / v.w;
  return clamp({ w: target.w, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k });
}

// How far the arrow keys pan: a tenth of the visible width. null for other keys.
export function keyPan(key, viewWidth) {
  const step = viewWidth * 0.1;
  return { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[key] ?? null;
}

// 1 = whole campus visible, 2 = twice as close, and so on.
export function zoomLevel(view, aspect, W, H) {
  return fullView(aspect, W, H).w / view.w;
}
