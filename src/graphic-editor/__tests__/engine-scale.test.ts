import { describe, expect, it } from "vitest";

import {
  findElementAtPoint,
  getElementIndicesInBounds,
  getElementLocalPoint,
  getResizeAnchorPoint,
  resizeElementFromHandle,
  observeHitTesting,
  simplifyPolyline,
  snapPointToElements,
  transformElementPoint,
  type HitTestProfileSample,
  type KizkattElement,
  type Point
} from "kizkatt-graphic-engine";

function createRectangle(index: number): KizkattElement {
  const column = index % 100;
  const row = Math.floor(index / 100);

  return {
    angle: 0,
    backgroundColor: "#ffffff",
    height: 32,
    id: `rectangle-${index}`,
    opacity: 100,
    strokeColor: "#000000",
    strokeStyle: "solid",
    strokeWidth: 2,
    type: "rectangle",
    width: 32,
    x: column * 64,
    y: row * 64
  };
}

describe("engine scale safeguards", () => {
  it("narrows hit testing to a small spatial-index candidate set", () => {
    const elements = Array.from({ length: 10_000 }, (_, index) =>
      createRectangle(index)
    );
    const samples: HitTestProfileSample[] = [];
    const stopObserving = observeHitTesting((sample) => samples.push(sample));

    expect(findElementAtPoint(elements, { x: 1, y: 1 })?.id).toBe(
      "rectangle-0"
    );
    stopObserving();

    expect(samples).toHaveLength(1);
    expect(samples[0].elementCount).toBe(10_000);
    expect(samples[0].candidateCount).toBeLessThan(100);
  });

  it("simplifies a large freehand stroke without losing its endpoints", () => {
    const points: Point[] = Array.from({ length: 5_000 }, (_, index) => ({
      x: index,
      y: index * 0.25 + Math.sin(index / 10) * 0.1
    }));

    const simplified = simplifyPolyline(points, 0.75);

    expect(simplified.length).toBeLessThan(points.length / 100);
    expect(simplified[0]).toEqual(points[0]);
    expect(simplified.at(-1)).toEqual(points.at(-1));
  });

  it("uses the same cached scene for object snapping during a gesture", () => {
    const elements = Array.from({ length: 10_000 }, (_, index) =>
      createRectangle(index)
    );
    const pointer = { x: 6_373, y: 6_371 };

    expect(snapPointToElements(pointer, elements)).toEqual({
      x: 6_368,
      y: 6_368
    });
    expect(
      snapPointToElements(pointer, elements, {
        ignoredIds: ["rectangle-9999"]
      })
    ).toBe(pointer);
  });

  it("limits gesture rendering to the viewport and selected objects", () => {
    const elements = Array.from({ length: 10_000 }, (_, index) =>
      createRectangle(index)
    );
    const visibleIndices = getElementIndicesInBounds(
      elements,
      { height: 256, width: 256, x: 0, y: 0 },
      new Set(["rectangle-9999"])
    );

    expect(visibleIndices).toHaveLength(26);
    expect(visibleIndices.at(-1)).toBe(9_999);
  });

  it("scales stroke width only when scale with object is enabled", () => {
    const rectangle = createRectangle(0);
    const point = {
      x: rectangle.x + rectangle.width * 2,
      y: rectangle.y + rectangle.height * 2
    };

    expect(
      resizeElementFromHandle(rectangle, "se", point).strokeWidth
    ).toBe(rectangle.strokeWidth);
    expect(
      resizeElementFromHandle(
        { ...rectangle, scaleStrokeWithObject: true },
        "se",
        point
      ).strokeWidth
    ).toBe(rectangle.strokeWidth * 2);
  });

  it("keeps mirrored element geometry interactive", () => {
    const rectangle = { ...createRectangle(0), flipX: true };
    const localCorner = { x: rectangle.x, y: rectangle.y };
    const mirroredCorner = {
      x: rectangle.x + rectangle.width,
      y: rectangle.y
    };

    expect(transformElementPoint(rectangle, localCorner)).toEqual(
      mirroredCorner
    );
    expect(getElementLocalPoint(rectangle, mirroredCorner)).toEqual(
      localCorner
    );
    expect(getResizeAnchorPoint(rectangle, "nw")).toEqual({ x: 0, y: 32 });

    const resized = resizeElementFromHandle(rectangle, "nw", {
      x: 64,
      y: -32
    });

    expect(resized).toMatchObject({
      flipX: true,
      height: 64,
      width: 64,
      x: 0,
      y: -32
    });
    expect(transformElementPoint(resized, { x: 0, y: -32 })).toEqual({
      x: 64,
      y: -32
    });
  });
});
