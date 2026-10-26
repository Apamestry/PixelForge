import { describe, it, expect } from "vitest";
import {
  computeDropPosition,
  computeCenterPosition,
  generateElementId,
  createNewElement,
} from "../dropPosition";

describe("drop-position math and element placement", () => {
  it("computes correct unscaled canvas position from pointer coordinates", () => {
    // stageScale = 1, pointer at (400, 300), element 100x100
    const pos = computeDropPosition({ x: 400, y: 300 }, 1.0, 100, 100, 1000, 1000);
    // x = 400 - 50 = 350, y = 300 - 50 = 250
    expect(pos).toEqual({ x: 350, y: 250 });
  });

  it("scales pointer position inversely when stage is zoomed in (scale = 2)", () => {
    // stageScale = 2, pointer at (800, 600)
    // Canvas coords: (800 / 2) - 50 = 350, (600 / 2) - 50 = 250
    const pos = computeDropPosition({ x: 800, y: 600 }, 2.0, 100, 100, 1000, 1000);
    expect(pos).toEqual({ x: 350, y: 250 });
  });

  it("scales pointer position inversely when stage is zoomed out (scale = 0.5)", () => {
    // stageScale = 0.5, pointer at (200, 150)
    // Canvas coords: (200 / 0.5) - 50 = 350, (150 / 0.5) - 50 = 250
    const pos = computeDropPosition({ x: 200, y: 150 }, 0.5, 100, 100, 1000, 1000);
    expect(pos).toEqual({ x: 350, y: 250 });
  });

  it("handles null or undefined pointer by falling back to canvas center", () => {
    const posNull = computeDropPosition(null, 1.0, 200, 100, 1000, 800);
    expect(posNull).toEqual({ x: 400, y: 350 });

    const posNaN = computeDropPosition({ x: NaN, y: NaN }, 1.0, 200, 100, 1000, 800);
    expect(posNaN).toEqual({ x: 400, y: 350 });
  });

  it("clamps drop position within canvas bounds", () => {
    // Pointer far negative
    const neg = computeDropPosition({ x: -50, y: -100 }, 1.0, 100, 100, 1000, 1000);
    expect(neg).toEqual({ x: 0, y: 0 });

    // Pointer far beyond canvas bounds
    const far = computeDropPosition({ x: 2000, y: 2000 }, 1.0, 100, 100, 1000, 1000);
    expect(far).toEqual({ x: 900, y: 900 });
  });

  it("computes center position correctly for click-to-add", () => {
    const center = computeCenterPosition(200, 100, 1080, 720);
    expect(center).toEqual({ x: 440, y: 310 });
  });

  it("generates unique element IDs that are valid for CSS/Konva selectors", () => {
    const id1 = generateElementId("text");
    const id2 = generateElementId("text");
    expect(id1).toMatch(/^text_[0-9a-f-]+$/i);
    expect(id2).toMatch(/^text_[0-9a-f-]+$/i);
    expect(id1).not.toEqual(id2);
  });

  it("creates valid SPEC-compliant elements", () => {
    const shape = createNewElement("shape", { shape: "rect", x: 10, y: 20 });
    expect(shape.type).toBe("shape");
    expect(shape.shape).toBe("rect");
    expect(shape.x).toBe(10);
    expect(shape.y).toBe(20);
    expect(shape.width).toBeGreaterThan(0);
    expect(shape.height).toBeGreaterThan(0);
    expect(shape.id).toBeDefined();

    const text = createNewElement("text", { text: "Hello" });
    expect(text.type).toBe("text");
    expect(text.text).toBe("Hello");
    expect(text.fontWeight).toBe(700);

    const img = createNewElement("image", { assetId: "asset-123" });
    expect(img.type).toBe("image");
    expect(img.assetId).toBe("asset-123");
    expect(img.filters).toBeDefined();
  });
});
