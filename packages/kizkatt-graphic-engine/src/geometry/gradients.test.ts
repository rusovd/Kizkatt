import { describe, expect, it } from "vitest";

import { DEFAULT_GRADIENT_FILL } from "../config/constants";
import {
  addGradientStop,
  addGradientStopToFirstSegment,
  getDefaultGradientFill,
  getGradientColorAtPosition,
  getGradientFillFromTransformElement,
  getRenderedGradientStops,
  getGradientStopPoint,
  getGradientStopPositionAtPoint,
  getGradientTransformElement,
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

  it("round-trips interactive transform geometry and stop positions", () => {
    const gradient = normalizeGradientFill({
      ...DEFAULT_GRADIENT_FILL,
      centerX: 42,
      centerY: 61,
      rotation: 28,
      scaleX: 72,
      scaleY: 48,
      skew: 12
    });
    const transformed = getGradientFillFromTransformElement(
      gradient,
      getGradientTransformElement(gradient)
    );

    expect(transformed).toMatchObject({
      centerX: 42,
      centerY: 61,
      rotation: 28,
      scaleX: 72,
      scaleY: 48
    });
    expect(transformed.skew).toBeCloseTo(12, 8);

    const stopPoint = getGradientStopPoint(gradient, 37);
    expect(getGradientStopPositionAtPoint(gradient, stopPoint)).toBeCloseTo(
      37,
      5
    );
  });

  it("adds a stop to the middle of the first segment", () => {
    const result = addGradientStopToFirstSegment({
      ...DEFAULT_GRADIENT_FILL,
      stops: [
        { id: "a", color: "#000000", opacity: 100, position: 10 },
        { id: "b", color: "#ffffff", opacity: 100, position: 50 },
        { id: "c", color: "#ffffff", opacity: 100, position: 100 }
      ]
    });

    expect(
      result.gradient.stops.find((stop) => stop.id === result.stopId)?.position
    ).toBe(30);
  });

  it("provides the black-to-white default without changing gradient type", () => {
    for (const type of ["linear", "radial", "conic", "diamond"] as const) {
      const gradient = getDefaultGradientFill(type);
      expect(gradient.type).toBe(type);
      expect(gradient.name).toBe("Default");
      expect(gradient.centerX).toBe(50);
      expect(gradient.stops.map((stop) => stop.color)).toEqual([
        "#000000",
        "#ffffff"
      ]);
    }
  });
});
