import { describe, it, expect } from "vitest";
import {
  computeZoomToFit,
  stepZoom,
  calculateWheelZoom,
  MIN_ZOOM,
  MAX_ZOOM,
} from "../zoomMath";

describe("zoomMath module", () => {
  describe("computeZoomToFit", () => {
    it("computes zoom for standard canvas fitting within larger viewport", () => {
      // 1000x1000 canvas in 1096x1096 viewport with 48 padding on both sides
      // Available: 1096 - 96 = 1000 -> scale 1.0
      const zoom = computeZoomToFit(1000, 1000, 1096, 1096, 48);
      expect(zoom).toBe(1.0);
    });

    it("scales down large canvas to fit viewport", () => {
      // 2000x2000 canvas in 1096x1096 viewport with 48 padding
      // Available: 1000 -> scale 0.5
      const zoom = computeZoomToFit(2000, 2000, 1096, 1096, 48);
      expect(zoom).toBe(0.5);
    });

    it("respects aspect ratio bottleneck (height-constrained)", () => {
      // 1000x2000 canvas in 1096x1096 viewport
      // scaleW = 1000/1000 = 1.0; scaleH = 1000/2000 = 0.5 -> min is 0.5
      const zoom = computeZoomToFit(1000, 2000, 1096, 1096, 48);
      expect(zoom).toBe(0.5);
    });

    it("respects aspect ratio bottleneck (width-constrained)", () => {
      // 2000x1000 canvas in 1096x1096 viewport
      const zoom = computeZoomToFit(2000, 1000, 1096, 1096, 48);
      expect(zoom).toBe(0.5);
    });

    it("handles zero or invalid viewport gracefully by returning 1.0", () => {
      expect(computeZoomToFit(1000, 1000, 0, 0)).toBe(1.0);
      expect(computeZoomToFit(0, 0, 800, 600)).toBe(1.0);
    });
  });

  describe("stepZoom", () => {
    it("steps zoom in by 0.1", () => {
      expect(stepZoom(0.7, "in")).toBe(0.8);
    });

    it("steps zoom out by 0.1", () => {
      expect(stepZoom(0.7, "out")).toBe(0.6);
    });

    it("clamps at MIN_ZOOM and MAX_ZOOM", () => {
      expect(stepZoom(MIN_ZOOM, "out")).toBe(MIN_ZOOM);
      expect(stepZoom(MAX_ZOOM, "in")).toBe(MAX_ZOOM);
    });
  });

  describe("calculateWheelZoom", () => {
    it("zooms in on negative deltaY", () => {
      const zoom = calculateWheelZoom(1.0, -100);
      expect(zoom).toBe(1.08);
    });

    it("zooms out on positive deltaY", () => {
      const zoom = calculateWheelZoom(1.0, 100);
      expect(zoom).toBe(0.92);
    });
  });
});
