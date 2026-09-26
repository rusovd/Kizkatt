import { describe, expect, it } from "vitest";

import { getElementOpacity } from "./element";
import { getExclusiveFillStylePatch } from "./style";

describe("element opacity", () => {
  it("keeps the configured value while uniform opacity is disabled", () => {
    expect(getElementOpacity({ opacity: 35, opacityEnabled: false })).toBe(1);
    expect(getElementOpacity({ opacity: 35, opacityEnabled: true })).toBe(0.35);
  });

  it("preserves opacity behavior for elements saved before the toggle existed", () => {
    expect(getElementOpacity({ opacity: 35 })).toBe(0.35);
  });
});

describe("exclusive fills", () => {
  it("selects an SVG texture and clears the other fill payloads", () => {
    const svgTexture = {
      name: "Abstract Envelope",
      textureId: "svg.abstract-envelope"
    };

    expect(getExclusiveFillStylePatch({ svgTexture })).toEqual({
      backgroundColor: "transparent",
      bitmapTexture: undefined,
      fillStyle: "svgTexture",
      gradientFill: undefined,
      svgTexture
    });
  });
});
