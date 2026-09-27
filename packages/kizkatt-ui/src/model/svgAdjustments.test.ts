import { describe, expect, it } from "vitest";

import {
  getSvgColorAdjustments,
  replaceSvgColor,
  scaleSvgStrokeWidths,
  svgHasEditableStrokes
} from "./svgAdjustments";

const svg = [
  '<svg xmlns="http://www.w3.org/2000/svg">',
  '<defs><linearGradient id="gradient">',
  '<stop stop-color="#fff"/>',
  "</linearGradient></defs>",
  '<path fill="#FFF" stroke="rgb(0, 0, 0)" stroke-width="2"/>',
  '<circle style="fill: #ff000080; stroke: #000; stroke-width: 0.5px"/>',
  '<rect fill="url(#gradient)"/>',
  "</svg>"
].join("");

describe("SVG adjustments", () => {
  it("collects literal fill, stroke, and gradient colors", () => {
    expect(getSvgColorAdjustments(svg)).toEqual([
      { color: "#ffffff", count: 2, value: "#ffffff" },
      { color: "#000000", count: 2, value: "#000000" },
      { color: "#ff0000", count: 1, value: "#ff000080" }
    ]);
    expect(svgHasEditableStrokes(svg)).toBe(true);
  });

  it("replaces matching colors while preserving alpha and paint URLs", () => {
    const nextCode = replaceSvgColor(svg, "#ff000080", "#336699");

    expect(nextCode).toContain("fill: #33669980");
    expect(nextCode).toContain('fill="url(#gradient)"');
  });

  it("scales explicit and inherited default stroke widths", () => {
    const nextCode = scaleSvgStrokeWidths(svg, 2);
    const document = new DOMParser().parseFromString(nextCode, "image/svg+xml");

    expect(document.documentElement.getAttribute("stroke-width")).toBe("2");
    expect(document.querySelector("path")?.getAttribute("stroke-width"))
      .toBe("4");
    expect(document.querySelector("circle")?.getAttribute("style"))
      .toContain("stroke-width: 1px");
  });
});
