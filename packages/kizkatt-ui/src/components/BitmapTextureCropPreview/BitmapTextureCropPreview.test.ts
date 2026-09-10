import { describe, expect, it } from "vitest";
import {
  constrainBitmapTextureCropElement,
  DEFAULT_BITMAP_TEXTURE_FILL
} from "kizkatt-graphic-engine";

import { getBitmapTextureCropPreviewLayout } from "./BitmapTextureCropPreview";

describe("getBitmapTextureCropPreviewLayout", () => {
  it("fits a landscape texture by height and scrolls only horizontally", () => {
    const layout = getBitmapTextureCropPreviewLayout(
      {
        ...DEFAULT_BITMAP_TEXTURE_FILL,
        height: 4912,
        width: 7360
      },
      { height: 4912, width: 7360 },
      { height: 800, width: 960 },
      { height: 400, width: 400 }
    );

    expect(layout.scrollAxis).toBe("horizontal");
    expect(layout.renderedHeight).toBe(400);
    expect(layout.renderedWidth).toBeCloseTo(599.35, 2);
    expect(layout.stageHeight).toBe(400);
    expect(layout.overlayWidth / layout.overlayHeight).toBeCloseTo(1.2);
  });

  it("fits a portrait texture by width and scrolls only vertically", () => {
    const layout = getBitmapTextureCropPreviewLayout(
      DEFAULT_BITMAP_TEXTURE_FILL,
      { height: 7360, width: 4912 },
      { height: 120, width: 70 },
      { height: 400, width: 400 }
    );

    expect(layout.scrollAxis).toBe("vertical");
    expect(layout.renderedWidth).toBe(400);
    expect(layout.renderedHeight).toBeCloseTo(599.35, 2);
    expect(layout.stageWidth).toBe(400);
  });

  it("keeps the scroll extent tied to the texture rather than the crop", () => {
    const naturalSize = { height: 900, width: 1600 };
    const targetSize = { height: 300, width: 500 };
    const viewportSize = { height: 400, width: 400 };
    const initial = getBitmapTextureCropPreviewLayout(
      {
        ...DEFAULT_BITMAP_TEXTURE_FILL,
        height: 900,
        width: 1600
      },
      naturalSize,
      targetSize,
      viewportSize
    );
    const transformed = getBitmapTextureCropPreviewLayout(
      {
        ...DEFAULT_BITMAP_TEXTURE_FILL,
        height: 2600,
        offsetX: 5000,
        offsetY: -700,
        width: 3400
      },
      naturalSize,
      targetSize,
      viewportSize
    );

    expect(transformed.scrollAxis).toBe("horizontal");
    expect(transformed.stageWidth).toBe(initial.stageWidth);
    expect(transformed.stageHeight).toBe(initial.stageHeight);
    expect(transformed.imageLeft).toBe(initial.imageLeft);
    expect(transformed.imageTop).toBe(initial.imageTop);
    expect(transformed.scale).toBe(initial.scale);
  });

  it("starts the crop with the target rotation and skew", () => {
    const layout = getBitmapTextureCropPreviewLayout(
      DEFAULT_BITMAP_TEXTURE_FILL,
      { height: 800, width: 1200 },
      { height: 200, width: 300 },
      { height: 400, width: 400 },
      { rotation: 32, skew: 11, skewY: -7 }
    );

    expect(layout.geometry.crop).toMatchObject({
      rotation: 32,
      skew: 11,
      skewY: -7
    });
  });
});

describe("constrainBitmapTextureCropElement", () => {
  const original = {
    angle: 0,
    backgroundColor: "transparent",
    height: 40,
    id: "crop",
    opacity: 100,
    strokeColor: "transparent",
    strokeStyle: "solid" as const,
    strokeWidth: 0,
    type: "rectangle" as const,
    width: 40,
    x: 20,
    y: 20
  };

  it("stops a moved crop at the texture edge", () => {
    const constrained = constrainBitmapTextureCropElement(
      original,
      { ...original, x: 90, y: -30 },
      { height: 100, width: 100 },
      true
    );

    expect(constrained.x).toBe(60);
    expect(constrained.y).toBe(0);
  });

  it("limits a resized crop to the texture bounds", () => {
    const constrained = constrainBitmapTextureCropElement(
      original,
      { ...original, height: 120, width: 120 },
      { height: 100, width: 100 }
    );

    expect(constrained.x).toBeCloseTo(20);
    expect(constrained.y).toBeCloseTo(20);
    expect(constrained.width).toBeCloseTo(80, 3);
    expect(constrained.height).toBeCloseTo(80, 3);
  });
});
