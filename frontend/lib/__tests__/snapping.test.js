import { describe, it, expect } from "vitest";
import { computeSnapping, SNAP_THRESHOLD } from "../snapping";

describe("snapping module", () => {
  it("snaps to left artboard edge (x=0) when within threshold", () => {
    // Left edge at x=4 (distance 4 <= 6)
    const result = computeSnapping({ x: 4, y: 100, width: 200, height: 100 }, [], 1000, 1000);
    expect(result.x).toBe(0);
    expect(result.guides).toContainEqual({ orientation: "vertical", position: 0 });
  });

  it("does not snap when distance exceeds threshold", () => {
    // Left edge at x=10 (distance 10 > 6)
    const result = computeSnapping({ x: 10, y: 100, width: 200, height: 100 }, [], 1000, 1000);
    expect(result.x).toBe(10);
    expect(result.guides.filter((g) => g.orientation === "vertical")).toHaveLength(0);
  });

  it("snaps to artboard horizontal and vertical center", () => {
    // Canvas 1000x1000, centers at 500, 500
    // Element 200x200, center is at x + 100, y + 100
    // Place at (398, 396) -> centers are 498, 496 (distance 2, 4 <= 6)
    const result = computeSnapping(
      { x: 398, y: 396, width: 200, height: 200 },
      [],
      1000,
      1000
    );
    expect(result.x).toBe(400); // 400 + 100 = 500
    expect(result.y).toBe(400); // 400 + 100 = 500
    expect(result.guides).toContainEqual({ orientation: "vertical", position: 500 });
    expect(result.guides).toContainEqual({ orientation: "horizontal", position: 500 });
  });

  it("snaps right edge to canvas right edge", () => {
    // Canvas 1000, element width 200 -> right edge is at x + 200
    // Place at x = 798 -> right edge is at 998 (distance 2 <= 6)
    const result = computeSnapping({ x: 798, y: 100, width: 200, height: 100 }, [], 1000, 1000);
    expect(result.x).toBe(800); // 800 + 200 = 1000
    expect(result.guides).toContainEqual({ orientation: "vertical", position: 1000 });
  });

  it("snaps to another element edges and center", () => {
    const other = { id: "other-1", x: 300, y: 300, width: 200, height: 200 };

    // Snap left edge to other's right edge (target 500)
    // Dragging at x = 503 (distance 3 <= 6)
    const result = computeSnapping(
      { id: "drag-1", x: 503, y: 100, width: 100, height: 100 },
      [other],
      2000,
      2000
    );
    expect(result.x).toBe(500);
    expect(result.guides).toContainEqual({ orientation: "vertical", position: 500 });
  });

  it("ignores snapping to the element itself", () => {
    const current = { id: "self-1", x: 250, y: 250, width: 100, height: 100 };
    // Placing at x = 252 should not snap to its own other target
    const result = computeSnapping(
      current,
      [current],
      2000,
      2000
    );
    expect(result.guides).toHaveLength(0);
  });
});
