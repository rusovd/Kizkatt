import { describe, expect, it } from "vitest";
import { DEFAULT_BITMAP_TEXTURE_FILL } from "kizkatt-graphic-engine";

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
});
