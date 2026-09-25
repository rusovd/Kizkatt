import { describe, expect, it } from "vitest";

import {
  getArrowheadGeometry,
  getLinearElementPoints,
  shortenLinePointsForArrowheads,
  type KizkattElement
} from "../index";

function createCurvedArrow(): KizkattElement {
  return {
    angle: 0,
    backgroundColor: "transparent",
    edgeStyle: "sharp",
    endArrowhead: "triangle",
    height: 0,
    id: "curved-arrow",
    linearSegmentControls: [
      {
        cp1: { x: 0, y: 100 },
        cp2: { x: 100, y: 100 },
        mode: "curve"
      }
    ],
    opacity: 100,
    sloppiness: "architect",
    strokeColor: "#f08c00",
    strokeStyle: "solid",
    strokeWidth: 4,
    type: "line",
    width: 100,
    x: 0,
    y: 0
  };
}

describe("arrowhead geometry", () => {
  it("aligns a curved line arrowhead with the endpoint tangent", () => {
    const element = createCurvedArrow();
    const linePoints = getLinearElementPoints(element);
    const geometry = getArrowheadGeometry(element, linePoints, "end");

    expect(geometry).not.toBeNull();
    expect(geometry?.angle).toBeCloseTo(-90);
    expect(geometry?.base.x).toBeCloseTo(100);
    expect(geometry?.base.y).toBeCloseTo(geometry!.length);

    const renderedPoints = shortenLinePointsForArrowheads(
      linePoints,
      null,
      geometry
    );

    expect(renderedPoints.at(-1)).toEqual(geometry?.base);
  });

  it("uses the outward tangent for a curved start arrowhead", () => {
    const element = {
      ...createCurvedArrow(),
      endArrowhead: "none" as const,
      startArrowhead: "triangle" as const
    };
    const linePoints = getLinearElementPoints(element);
    const geometry = getArrowheadGeometry(element, linePoints, "start");

    expect(geometry).not.toBeNull();
    expect(geometry?.angle).toBeCloseTo(-90);
    expect(geometry?.base.x).toBeCloseTo(0);
    expect(geometry?.base.y).toBeCloseTo(geometry!.length);
  });
});
