import { describe, expect, it } from "vitest";

import {
  getSvgTextureSource,
  svgTextureCatalog
} from "./svgFillCatalog";

describe("SVG fill catalog", () => {
  it("exposes every bundled SVG with a stable id and readable name", () => {
    expect(svgTextureCatalog).toHaveLength(25);
    expect(new Set(svgTextureCatalog.map((texture) => texture.id)).size)
      .toBe(svgTextureCatalog.length);
    expect(svgTextureCatalog[0]).toMatchObject({
      id: "svg.abstract-envelope",
      name: "Abstract Envelope"
    });
    expect(svgTextureCatalog[0].code).toContain("<svg");
    const source = getSvgTextureSource("svg.subtle-prism");
    const sourceValue = source ?? "";
    const code = decodeURIComponent(
      sourceValue.slice(sourceValue.indexOf(",") + 1)
    );
    const root = new DOMParser().parseFromString(code, "image/svg+xml")
      .documentElement;

    expect(source).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    expect(root.getAttribute("viewBox")).toBe("0 0 1080 900");
    expect(root.getAttribute("preserveAspectRatio")).toBe("none");
  });
});
