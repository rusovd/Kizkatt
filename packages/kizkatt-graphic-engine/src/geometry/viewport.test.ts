import { describe, expect, it } from "vitest";

import {
  fitBoundsInViewport,
  getLogicalPageBounds,
  panViewportByWheel,
  zoomViewportAtPoint
} from "./viewport";

describe("viewport geometry", () => {
  it("keeps the pivot world point stable while zooming", () => {
    const result = zoomViewportAtPoint(
      { pan: { x: 20, y: 30 }, zoom: 1 },
      1.5,
      { x: 120, y: 80 }
    );

    expect(result).toEqual({
      pan: { x: -30, y: 5 },
      zoom: 1.5
    });
    expect((120 - result.pan.x) / result.zoom).toBe(100);
    expect((80 - result.pan.y) / result.zoom).toBe(50);
  });

  it("fits bounds by the requested viewport axis", () => {
    const bounds = { x: 100, y: 50, width: 200, height: 100 };
    const viewport = { width: 600, height: 300 };

    expect(
      fitBoundsInViewport(bounds, viewport, {
        mode: "contain",
        padding: 0
      })
    ).toEqual({ pan: { x: -300, y: -150 }, zoom: 3 });
    expect(
      fitBoundsInViewport(bounds, viewport, {
        mode: "height",
        padding: 50
      })?.zoom
    ).toBe(2);
  });

  it("creates an empty logical page at 100% and pans with both wheel axes", () => {
    expect(getLogicalPageBounds([], { width: 800, height: 600 })).toEqual({
      x: 0,
      y: 0,
      width: 800,
      height: 600
    });
    expect(
      panViewportByWheel({ x: 20, y: 30 }, { x: -5, y: 12 })
    ).toEqual({ x: 25, y: 18 });
  });
});
