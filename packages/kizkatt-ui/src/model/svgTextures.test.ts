import { describe, expect, it } from "vitest";

import {
  createSvgTextureDataUrl,
  getSvgTextureCanvas,
  normalizeSvgTextureCode
} from "./svgTextures";

const patternWithoutRootViewBox = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="100%">',
  "  <defs>",
  '    <pattern id="tiles" width="540" height="450" viewBox="0 0 1080 900"/>',
  "  </defs>",
  '  <rect width="100%" height="100%" fill="url(#tiles)"/>',
  "</svg>"
].join("\n");

describe("SVG textures", () => {
  it("infers a scalable canvas from a nested viewBox", () => {
    expect(getSvgTextureCanvas(patternWithoutRootViewBox)).toEqual({
      height: 900,
      minX: 0,
      minY: 0,
      width: 1080
    });

    const normalized = new DOMParser().parseFromString(
      normalizeSvgTextureCode(patternWithoutRootViewBox),
      "image/svg+xml"
    ).documentElement;

    expect(normalized.getAttribute("viewBox")).toBe("0 0 1080 900");
    expect(normalized.getAttribute("width")).toBe("1080");
    expect(normalized.getAttribute("height")).toBe("900");
    expect(normalized.getAttribute("preserveAspectRatio")).toBe("none");
  });

  it("embeds the normalized SVG in its data URL", () => {
    const source = createSvgTextureDataUrl(patternWithoutRootViewBox);
    const code = decodeURIComponent(source.slice(source.indexOf(",") + 1));
    const root = new DOMParser().parseFromString(code, "image/svg+xml")
      .documentElement;

    expect(source).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    expect(root.getAttribute("viewBox")).toBe("0 0 1080 900");
    expect(root.getAttribute("preserveAspectRatio")).toBe("none");
  });
});
