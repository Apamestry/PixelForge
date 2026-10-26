/**
 * Pure math helpers for viewport zoom and canvas fitting.
 */

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3.0;
export const ZOOM_STEP = 0.1;

/**
 * Computes the optimal scale factor to fit a canvas within a viewport container.
 *
 * @param {number} canvasWidth - Canvas width in px
 * @param {number} canvasHeight - Canvas height in px
 * @param {number} viewportWidth - Viewport container width in px
 * @param {number} viewportHeight - Viewport container height in px
 * @param {number} [padding=48] - Padding around the artboard in px
 * @returns {number} Scale factor rounded to 2 decimals
 */
export function computeZoomToFit(
  canvasWidth,
  canvasHeight,
  viewportWidth,
  viewportHeight,
  padding = 48
) {
  if (
    !canvasWidth ||
    !canvasHeight ||
    !viewportWidth ||
    !viewportHeight ||
    canvasWidth <= 0 ||
    canvasHeight <= 0 ||
    viewportWidth <= 0 ||
    viewportHeight <= 0
  ) {
    return 1.0;
  }

  const availableW = Math.max(50, viewportWidth - padding * 2);
  const availableH = Math.max(50, viewportHeight - padding * 2);

  const scaleW = availableW / canvasWidth;
  const scaleH = availableH / canvasHeight;

  const rawScale = Math.min(scaleW, scaleH);
  const clampedScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, rawScale));

  return Math.round(clampedScale * 100) / 100;
}

/**
 * Adjusts zoom step by step (+ or -).
 *
 * @param {number} currentZoom
 * @param {"in" | "out"} direction
 * @returns {number}
 */
export function stepZoom(currentZoom, direction) {
  const delta = direction === "in" ? ZOOM_STEP : -ZOOM_STEP;
  const next = Math.round((currentZoom + delta) * 10) / 10;
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
}

/**
 * Handles mouse wheel zoom with Ctrl or Cmd key.
 *
 * @param {number} currentZoom
 * @param {number} deltaY
 * @returns {number}
 */
export function calculateWheelZoom(currentZoom, deltaY) {
  const zoomFactor = deltaY < 0 ? 1.08 : 0.92;
  const next = Math.round(currentZoom * zoomFactor * 100) / 100;
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
}
