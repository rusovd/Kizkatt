import { describe, expect, it } from "vitest";

import {
  DEFAULT_SIMPLE_TRACE_SETTINGS,
  createSimpleTraceElement,
  traceSimpleBitmap
} from "./simpleTrace";
import { createElement } from "../model/element";
import { DEFAULT_ELEMENT_STYLE_BY_THEME } from "../config/constants";

function createRaster(
  width: number,
  height: number,
  pixel: (x: number, y: number) => [number, number, number, number]
) {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      data.set(pixel(x, y), (y * width + x) * 4);
    }
  }

  return { data, height, width };
}

describe("simple bitmap trace", () => {
  it("removes the dominant background and creates a closed colored path", () => {
    const raster = createRaster(6, 6, (x, y) =>
      x >= 2 && x <= 3 && y >= 1 && y <= 4
        ? [220, 20, 30, 255]
        : [255, 255, 255, 255]
    );
    const result = traceSimpleBitmap(raster, {
      ...DEFAULT_SIMPLE_TRACE_SETTINGS,
      colorCount: 2,
      cornerSmoothing: 0,
      detail: 100,
      smoothing: 0
    });

    expect(result.colorCount).toBe(1);
    expect(result.pathCount).toBe(1);
    expect(result.svgContent).toContain("<path");
    expect(result.svgContent).toContain("fill-rule=\"evenodd\"");
    expect(result.svgContent).not.toContain("#ffffff");
  });

  it("keeps transparent pixels outside the vector result", () => {
    const raster = createRaster(4, 4, (x, y) =>
      x === 1 && y === 1 ? [0, 0, 0, 255] : [0, 0, 0, 0]
    );
    const result = traceSimpleBitmap(raster, {
      backgroundRemoval: "none",
      colorCount: 2,
      detail: 100
    });

    expect(result.pathCount).toBe(1);
  });

  it("creates an inline SVG image that preserves source geometry", () => {
    const source = {
      ...createElement(
        "image",
        { x: 12, y: 24 },
        DEFAULT_ELEMENT_STYLE_BY_THEME.dark
      ),
      angle: 17,
      height: 80,
      src: "data:image/png;base64,test",
      width: 120
    };
    const traced = createSimpleTraceElement({
      id: "trace-id",
      name: "Image 2",
      result: {
        colorCount: 1,
        height: 20,
        nodeCount: 4,
        pathCount: 1,
        svgContent: '<path d="M0 0H20V20Z" fill="#000"/>',
        width: 20
      },
      source
    });

    expect(traced).toMatchObject({
      angle: 17,
      height: 80,
      id: "trace-id",
      name: "Image 2",
      src: undefined,
      svgUseElementStyle: false,
      svgViewBox: "0 0 20 20",
      width: 120,
      x: 12,
      y: 24
    });
  });
});
