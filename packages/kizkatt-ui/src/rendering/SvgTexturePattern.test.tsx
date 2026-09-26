import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { KizkattElement } from "kizkatt-graphic-engine";

import { SvgTextureFillPattern } from "./SvgTexturePattern";

const rectangle: KizkattElement = {
  angle: 0,
  backgroundColor: "transparent",
  fillStyle: "svgTexture",
  height: 70,
  id: "svg-filled-rectangle",
  opacity: 100,
  strokeColor: "#000000",
  strokeStyle: "solid",
  strokeWidth: 1,
  svgTexture: {
    name: "Abstract Envelope",
    textureId: "svg.abstract-envelope"
  },
  type: "rectangle",
  width: 120,
  x: 40,
  y: 50
};

describe("SvgTextureFillPattern", () => {
  it("fits an SVG texture to the object bounds", () => {
    const { container } = render(
      <svg>
        <SvgTextureFillPattern
          element={rectangle}
          patternId="svg-texture"
          source="abstract-envelope.svg"
        />
      </svg>
    );
    const pattern = container.querySelector("pattern");
    const image = container.querySelector("image");
    const transform = container.querySelector("[data-svg-texture-transform]");

    expect(pattern).toHaveAttribute("data-svg-texture-fill", "true");
    expect(pattern).toHaveAttribute("patternUnits", "objectBoundingBox");
    expect(pattern).toHaveAttribute("preserveAspectRatio", "none");
    expect(pattern).toHaveAttribute("viewBox", "0 0 120 70");
    expect(pattern).toHaveAttribute("width", "1");
    expect(pattern).toHaveAttribute("height", "1");
    expect(image).toHaveAttribute("href", "abstract-envelope.svg");
    expect(image).toHaveAttribute("preserveAspectRatio", "none");
    expect(image).toHaveAttribute("width", "120");
    expect(image).toHaveAttribute("height", "70");
    expect(image).toHaveAttribute("x", "-60");
    expect(image).toHaveAttribute("y", "-35");
    expect(transform).toHaveAttribute(
      "transform",
      "translate(60 35) rotate(0) skewX(0) skewY(0)"
    );
  });

  it("keeps a screen-sized SVG texture transform when fit is disabled", () => {
    const { container } = render(
      <svg>
        <SvgTextureFillPattern
          element={{
            ...rectangle,
            svgTexture: {
              fitToObject: false,
              height: 540,
              name: "Abstract Envelope",
              offsetX: 18,
              offsetY: -12,
              rotation: 24,
              skew: 5,
              skewY: -3,
              textureId: "svg.abstract-envelope",
              width: 960
            }
          }}
          patternId="screen-svg-texture"
          source="abstract-envelope.svg"
        />
      </svg>
    );

    expect(container.querySelector("image")).toHaveAttribute("width", "960");
    expect(container.querySelector("image")).toHaveAttribute("height", "540");
    expect(container.querySelector("[data-svg-texture-transform]"))
      .toHaveAttribute(
        "transform",
        "translate(78 23) rotate(24) skewX(5) skewY(-3)"
      );
  });
});
