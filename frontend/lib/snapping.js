/**
 * Canvas snapping math for dragging elements.
 * Snaps to artboard edges, artboard center, and other elements' edges/centers.
 */

export const SNAP_THRESHOLD = 6;

/**
 * Computes snapped (x, y) and active guide lines.
 *
 * @param {{ id?: string, x: number, y: number, width: number, height?: number }} dragging
 * @param {Array<{ id?: string, x: number, y: number, width: number, height?: number }>} others
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {number} [threshold=6]
 * @returns {{ x: number, y: number, guides: Array<{ orientation: "vertical" | "horizontal", position: number }> }}
 */
export function computeSnapping(
  dragging,
  others = [],
  canvasWidth = 1080,
  canvasHeight = 1080,
  threshold = SNAP_THRESHOLD
) {
  const w = dragging.width || 100;
  const h = dragging.height || dragging.width || 100;

  let snappedX = dragging.x;
  let snappedY = dragging.y;

  const guides = [];

  // Candidate snap lines on the canvas
  // X candidates: [position, description]
  const xTargets = [
    0, // Canvas Left
    Math.round(canvasWidth / 2), // Canvas Center
    canvasWidth, // Canvas Right
  ];

  // Y candidates
  const yTargets = [
    0, // Canvas Top
    Math.round(canvasHeight / 2), // Canvas Center
    canvasHeight, // Canvas Bottom
  ];

  // Add targets from other elements
  for (const other of others) {
    if (other.id && dragging.id && other.id === dragging.id) continue;
    const ow = other.width || 100;
    const oh = other.height || other.width || 100;

    xTargets.push(other.x);
    xTargets.push(Math.round(other.x + ow / 2));
    xTargets.push(other.x + ow);

    yTargets.push(other.y);
    yTargets.push(Math.round(other.y + oh / 2));
    yTargets.push(other.y + oh);
  }

  // --- Horizontal (X) Snapping ---
  // Dragging reference points: Left, Center, Right
  const dragXPoints = [
    { offset: 0, point: dragging.x },
    { offset: w / 2, point: dragging.x + w / 2 },
    { offset: w, point: dragging.x + w },
  ];

  let minDeltaX = threshold + 1;
  let bestTargetX = null;
  let bestOffsetDiffX = 0;

  for (const target of xTargets) {
    for (const dp of dragXPoints) {
      const delta = Math.abs(dp.point - target);
      if (delta <= threshold && delta < minDeltaX) {
        minDeltaX = delta;
        bestTargetX = target;
        bestOffsetDiffX = target - dp.offset;
      }
    }
  }

  if (bestTargetX !== null) {
    snappedX = Math.round(bestOffsetDiffX);
    guides.push({ orientation: "vertical", position: bestTargetX });
  }

  // --- Vertical (Y) Snapping ---
  // Dragging reference points: Top, Center, Bottom
  const dragYPoints = [
    { offset: 0, point: dragging.y },
    { offset: h / 2, point: dragging.y + h / 2 },
    { offset: h, point: dragging.y + h },
  ];

  let minDeltaY = threshold + 1;
  let bestTargetY = null;
  let bestOffsetDiffY = 0;

  for (const target of yTargets) {
    for (const dp of dragYPoints) {
      const delta = Math.abs(dp.point - target);
      if (delta <= threshold && delta < minDeltaY) {
        minDeltaY = delta;
        bestTargetY = target;
        bestOffsetDiffY = target - dp.offset;
      }
    }
  }

  if (bestTargetY !== null) {
    snappedY = Math.round(bestOffsetDiffY);
    guides.push({ orientation: "horizontal", position: bestTargetY });
  }

  return {
    x: snappedX,
    y: snappedY,
    guides,
  };
}
