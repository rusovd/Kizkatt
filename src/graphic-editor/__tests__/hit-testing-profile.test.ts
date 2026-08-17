import { describe, expect, it } from "vitest";

import {
  findElementAtPoint,
  observeHitTesting,
  type HitTestProfileSample,
  type KizkattElement
} from "kizkatt-graphic-engine";

const rectangle: KizkattElement = {
  angle: 0,
  backgroundColor: "#ffffff",
  height: 80,
  id: "profile-rectangle",
  opacity: 100,
  strokeColor: "#000000",
  strokeStyle: "solid",
  strokeWidth: 2,
  type: "rectangle",
  width: 120,
  x: 10,
  y: 20
};

describe("hit-testing profiling", () => {
  it("reports real hit tests only while an observer is subscribed", () => {
    const samples: HitTestProfileSample[] = [];
    const stopObserving = observeHitTesting((sample) => samples.push(sample));

    expect(findElementAtPoint([rectangle], { x: 10, y: 20 })).toBe(rectangle);
    expect(samples).toHaveLength(1);
    expect(samples[0]).toMatchObject({
      elementCount: 1,
      hitElementId: rectangle.id,
      point: { x: 10, y: 20 }
    });
    expect(samples[0].durationMs).toBeGreaterThanOrEqual(0);

    stopObserving();
    findElementAtPoint([rectangle], { x: 500, y: 500 });

    expect(samples).toHaveLength(1);
  });
});
