/**
 * Drop position and element placement pure logic.
 */

export function generateElementId(prefix = "") {
  let uuid;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    uuid = crypto.randomUUID();
  } else {
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    uuid = `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
  }
  return prefix ? `${prefix}_${uuid}` : uuid;
}

/**
 * Computes canvas coordinates for a dropped item given Konva stage pointer position and stage scale.
 *
 * @param {{x: number, y: number} | null | undefined} pointerPosition - Position from stage.getPointerPosition() after stage.setPointersPositions(e)
 * @param {number} stageScale - Scale of the Konva stage (must be > 0)
 * @param {number} elementWidth - Width of dropped element
 * @param {number} elementHeight - Height of dropped element
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @returns {{x: number, y: number}} Clamped canvas coordinates
 */
export function computeDropPosition(
  pointerPosition,
  stageScale = 1.0,
  elementWidth = 0,
  elementHeight = 0,
  canvasWidth = 1080,
  canvasHeight = 1080
) {
  const scale = stageScale > 0 ? stageScale : 1.0;

  if (
    !pointerPosition ||
    typeof pointerPosition.x !== "number" ||
    typeof pointerPosition.y !== "number" ||
    Number.isNaN(pointerPosition.x) ||
    Number.isNaN(pointerPosition.y)
  ) {
    return computeCenterPosition(elementWidth, elementHeight, canvasWidth, canvasHeight);
  }

  // Divide by stage scale so coordinates map 1:1 to canvas coordinates, centered on cursor
  const rawX = Math.round(pointerPosition.x / scale - elementWidth / 2);
  const rawY = Math.round(pointerPosition.y / scale - elementHeight / 2);

  // Clamp within canvas boundaries
  const maxX = Math.max(0, canvasWidth - Math.min(elementWidth, canvasWidth));
  const maxY = Math.max(0, canvasHeight - Math.min(elementHeight, canvasHeight));

  const x = Math.max(0, Math.min(maxX, rawX));
  const y = Math.max(0, Math.min(maxY, rawY));

  return { x, y };
}

/**
 * Computes center position on the canvas for click-to-add.
 *
 * @param {number} elementWidth
 * @param {number} elementHeight
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {{scrollLeft?: number, scrollTop?: number, clientWidth?: number, clientHeight?: number} | null} viewportBounds
 * @returns {{x: number, y: number}}
 */
export function computeCenterPosition(
  elementWidth = 0,
  elementHeight = 0,
  canvasWidth = 1080,
  canvasHeight = 1080,
  viewportBounds = null
) {
  if (
    viewportBounds &&
    typeof viewportBounds.scrollLeft === "number" &&
    typeof viewportBounds.clientWidth === "number" &&
    viewportBounds.clientWidth > 0
  ) {
    const visibleCenterX = viewportBounds.scrollLeft + viewportBounds.clientWidth / 2;
    const visibleCenterY = viewportBounds.scrollTop + viewportBounds.clientHeight / 2;
    const rawX = Math.round(visibleCenterX - elementWidth / 2);
    const rawY = Math.round(visibleCenterY - elementHeight / 2);
    const maxX = Math.max(0, canvasWidth - Math.min(elementWidth, canvasWidth));
    const maxY = Math.max(0, canvasHeight - Math.min(elementHeight, canvasHeight));
    return {
      x: Math.max(0, Math.min(maxX, rawX)),
      y: Math.max(0, Math.min(maxY, rawY)),
    };
  }

  const x = Math.round(Math.max(0, (canvasWidth - elementWidth) / 2));
  const y = Math.round(Math.max(0, (canvasHeight - elementHeight) / 2));
  return { x, y };
}

/**
 * Creates a valid element adhering strictly to SPEC Section 3.
 */
export function createNewElement(type, options = {}) {
  const id = options.id || generateElementId(type);
  const x = options.x ?? 0;
  const y = options.y ?? 0;

  if (type === "text") {
    return {
      id,
      type: "text",
      text: options.text || "Heading Text",
      x,
      y,
      width: options.width || 400,
      rotation: 0,
      opacity: 1.0,
      fontFamily: options.fontFamily || "Roboto",
      fontSize: options.fontSize || 48,
      fontWeight: options.fontWeight || 700,
      fill: options.fill || "#0F172A",
      align: options.align || "left",
      lineHeight: 1.2,
    };
  }

  if (type === "shape") {
    const shape = options.shape || "rect";
    return {
      id,
      type: "shape",
      shape,
      x,
      y,
      width: options.width || (shape === "rect" ? 250 : 200),
      height: options.height || (shape === "rect" ? 180 : 200),
      rotation: 0,
      opacity: 1.0,
      fill: options.fill || "#065A82",
      stroke: options.stroke || "#0F172A",
      strokeWidth: options.strokeWidth || 0,
      cornerRadius: shape === "rect" ? (options.cornerRadius ?? 6) : 0,
    };
  }

  if (type === "image") {
    return {
      id,
      type: "image",
      assetId: options.assetId,
      x,
      y,
      width: options.width || 400,
      height: options.height || 400,
      rotation: 0,
      opacity: 1.0,
      filters: options.filters || {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        grayscale: false,
      },
    };
  }

  throw new Error(`Unknown element type: ${type}`);
}
