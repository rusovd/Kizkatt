import { describe, expect, it } from "vitest";

import { DEFAULT_GRADIENT_FILL } from "../config/constants";
import {
  addGradientStop,
  getGradientColorAtPosition,
  getRenderedGradientStops,
  normalizeGradientFill,
  removeGradientStop,
  reverseGradientStops
} from "./gradients";

describe("gradient geometry", () => {
  it("normalizes imported values and keeps at least two stops", () => {
    const gradient = normalizeGradientFill({
      acceleration: 500,
      centerX: -500,
      scaleX: 0,
      steps: 1000,
      stops: [{ id: "only", color: "invalid", opacity: 200, position: -5 }]
    });

    expect(gradient.acceleration).toBe(100);
    expect(gradient.centerX).toBe(-200);
    expect(gradient.scaleX).toBe(1);
    expect(gradient.steps).toBe(256);
    expect(gradient.stops).toHaveLength(2);
  });

  it("interpolates, inserts, removes and reverses stops", () => {
    expect(
      getGradientColorAtPosition(DEFAULT_GRADIENT_FILL.stops, 0.5)
    ).toEqual({ color: "#808080", opacity: 100 });

    const inserted = addGradientStop(DEFAULT_GRADIENT_FILL, 25);
    expect(inserted.gradient.stops).toHaveLength(3);
    expect(
      inserted.gradient.stops.find((stop) => stop.id === inserted.stopId)
    ).toMatchObject({ color: "#404040", position: 25 });

    const removed = removeGradientStop(inserted.gradient, inserted.stopId);
    expect(removed.stops).toHaveLength(2);

    const reversed = reverseGradientStops({
      ...inserted.gradient,
      stops: [
        { id: "a", color: "#111111", opacity: 100, position: 10 },
        { id: "b", color: "#eeeeee", opacity: 100, position: 80 }
      ]
    });
    expect(reversed.stops.map((stop) => stop.position)).toEqual([20, 90]);
  });

  it("creates duplicate offsets for stepped transitions", () => {
    const stops = getRenderedGradientStops({
      ...DEFAULT_GRADIENT_FILL,
      smooth: false,
      steps: 4,
      stepsEnabled: true
    });

    expect(stops).toHaveLength(9);
    expect(stops[1].position).toBe(stops[2].position);
    expect(stops[1].color).not.toBe(stops[2].color);
  });
});
