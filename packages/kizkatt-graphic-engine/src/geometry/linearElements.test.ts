import { describe, expect, it } from "vitest";

import {
  getLinearElementPoints,
  insertLinearElementBend,
  moveLinearElementNodes,
  moveLinearElementSegment,
  transformElementPoint,
  type KizkattElement
} from "../index";

function createEditableLine(
  overrides: Partial<KizkattElement> = {}
): KizkattElement {
  return {
    angle: 0,
    backgroundColor: "transparent",
    bends: [
      { x: 100, y: 0 },
      { x: 200, y: 0 },
      { x: 300, y: 0 }
    ],
    edgeStyle: "sharp",
    height: 0,
    id: "line",
    opacity: 100,
    strokeColor: "#111111",
    strokeStyle: "solid",
    strokeWidth: 4,
    type: "line",
    width: 400,
    x: 0,
    y: 0,
    ...overrides
  };
}

describe("linear element node editing", () => {
  it("inserts a point into the explicitly targeted straight segment", () => {
    const element = createEditableLine();
    const result = insertLinearElementBend(
      element,
      { x: 245, y: 30 },
      2
    );

    expect(result).not.toBeNull();
    expect(result?.bendIndex).toBe(2);
    expect(getLinearElementPoints(result!.element)).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 200, y: 0 },
      { x: 245, y: 0 },
      { x: 300, y: 0 },
      { x: 400, y: 0 }
    ]);
    expect(result?.element.linearSegmentControls).toEqual([
      { mode: "line" },
      { mode: "line" },
      { mode: "line" },
      { mode: "line" },
      { mode: "line" }
    ]);
  });

  it("splits only the targeted curve and preserves distant controls", () => {
    const firstControl = {
      cp1: { x: 25, y: -20 },
      cp2: { x: 75, y: -20 },
      mode: "curve" as const
    };
    const lastControl = {
      cp1: { x: 325, y: 20 },
      cp2: { x: 375, y: 20 },
      mode: "curve" as const
    };
    const element = createEditableLine({
      linearSegmentControls: [
        firstControl,
        {
          cp1: { x: 125, y: 40 },
          cp2: { x: 175, y: 40 },
          mode: "curve"
        },
        {
          cp1: { x: 225, y: -30 },
          cp2: { x: 275, y: -30 },
          mode: "curve"
        },
        lastControl
      ]
    });
    const result = insertLinearElementBend(element, { x: 150, y: 30 }, 1);

    expect(result).not.toBeNull();
    expect(result?.element.linearSegmentControls).toHaveLength(5);
    expect(result?.element.linearSegmentControls?.[0]).toEqual(firstControl);
    expect(result?.element.linearSegmentControls?.[4]).toEqual(lastControl);
    expect(result?.element.linearSegmentControls?.[1].mode).toBe("curve");
    expect(result?.element.linearSegmentControls?.[2].mode).toBe("curve");
  });

  it("moves a straight segment with both endpoints and keeps adjacent segments straight", () => {
    const element = createEditableLine();
    const result = moveLinearElementSegment(element, 1, { x: 10, y: 30 });

    expect(getLinearElementPoints(result.element)).toEqual([
      { x: 0, y: 0 },
      { x: 110, y: 30 },
      { x: 210, y: 30 },
      { x: 300, y: 0 },
      { x: 400, y: 0 }
    ]);
    expect(result.element.linearSegmentControls).toEqual([
      { mode: "line" },
      { mode: "line" },
      { mode: "line" },
      { mode: "line" }
    ]);
  });

  it("translates a segment in world coordinates on a rotated line", () => {
    const element = createEditableLine({ angle: Math.PI / 5 });
    const originalWorldPoints = getLinearElementPoints(element).map((point) =>
      transformElementPoint(element, point)
    );
    const delta = { x: 24, y: -13 };
    const result = moveLinearElementSegment(element, 1, delta);
    const nextWorldPoints = getLinearElementPoints(result.element).map((point) =>
      transformElementPoint(result.element, point)
    );

    nextWorldPoints.forEach((point, index) => {
      expect(point.x).toBeCloseTo(
        originalWorldPoints[index].x +
          (index === 1 || index === 2 ? delta.x : 0)
      );
      expect(point.y).toBeCloseTo(
        originalWorldPoints[index].y +
          (index === 1 || index === 2 ? delta.y : 0)
      );
    });
  });

  it("moves only controls attached to the edited node", () => {
    const element = createEditableLine({
      edgeStyle: "round",
      linearSegmentControls: [
        {
          cp1: { x: 30, y: -20 },
          cp2: { x: 70, y: -20 },
          mode: "curve"
        },
        {
          cp1: { x: 130, y: 20 },
          cp2: { x: 170, y: 20 },
          mode: "curve"
        },
        {
          cp1: { x: 230, y: -30 },
          cp2: { x: 270, y: -30 },
          mode: "curve"
        },
        {
          cp1: { x: 330, y: 10 },
          cp2: { x: 370, y: 10 },
          mode: "curve"
        }
      ]
    });
    const result = moveLinearElementNodes(element, [1], { x: 10, y: 15 });

    expect(getLinearElementPoints(result.element)).toEqual([
      { x: 0, y: 0 },
      { x: 110, y: 15 },
      { x: 200, y: 0 },
      { x: 300, y: 0 },
      { x: 400, y: 0 }
    ]);
    expect(result.element.linearSegmentControls).toEqual([
      {
        cp1: { x: 30, y: -20 },
        cp2: { x: 80, y: -5 },
        mode: "curve"
      },
      {
        cp1: { x: 140, y: 35 },
        cp2: { x: 170, y: 20 },
        mode: "curve"
      },
      {
        cp1: { x: 230, y: -30 },
        cp2: { x: 270, y: -30 },
        mode: "curve"
      },
      {
        cp1: { x: 330, y: 10 },
        cp2: { x: 370, y: 10 },
        mode: "curve"
      }
    ]);
  });
});
