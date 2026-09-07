import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_BITMAP_TEXTURE_FILL,
  type KizkattElement
} from "kizkatt-graphic-engine";

import { BitmapTextureFillPattern } from "./BitmapTexturePattern";

const rectangle: KizkattElement = {
  angle: 0,
  backgroundColor: "transparent",
  edgeStyle: "round",
  fillStyle: "monochromeTexture",
  height: 70,
  id: "rectangle-1",
  opacity: 100,
  strokeColor: "#000000",
  strokeStyle: "solid",
  strokeWidth: 1,
  type: "rectangle",
  width: 120,
  x: 40,
  y: 50
};

describe("BitmapTextureFillPattern", () => {
  it("repeats a smaller texture only when tiling is enabled", () => {
    const { container } = render(
      <svg>
        <BitmapTextureFillPattern
          element={rectangle}
          patternId="texture"
          source="texture.png"
          texture={{
            ...DEFAULT_BITMAP_TEXTURE_FILL,
            height: 30,
            offsetX: 5,
            rotation: 15,
            textureId: "monochrome.abstract.001",
            tile: true,
            width: 40
          }}
        />
      </svg>
    );
    const pattern = container.querySelector("pattern");
    const image = container.querySelector("image");

    expect(pattern).toHaveAttribute("data-bitmap-repeat", "tile");
    expect(pattern).toHaveAttribute("width", "40");
    expect(pattern).toHaveAttribute("height", "30");
    expect(pattern).toHaveAttribute("x", "85");
    expect(pattern).toHaveAttribute("y", "70");
    expect(pattern?.getAttribute("patternTransform")).toContain("rotate(15)");
    expect(image).toHaveAttribute("x", "85");
    expect(image).toHaveAttribute("y", "70");
  });

  it("keeps a texture non-repeating when it already covers the object", () => {
    const { container } = render(
      <svg>
        <BitmapTextureFillPattern
          element={rectangle}
          patternId="texture"
          source="texture.png"
          texture={{
            ...DEFAULT_BITMAP_TEXTURE_FILL,
            height: 100,
            textureId: "monochrome.abstract.001",
            tile: true,
            width: 150
          }}
        />
      </svg>
    );

    const pattern = container.querySelector("pattern");

    expect(pattern).toHaveAttribute("data-bitmap-repeat", "none");
    expect(pattern).toHaveAttribute("data-texture-coordinate-space", "object");
    expect(pattern).toHaveAttribute("patternUnits", "objectBoundingBox");
    expect(pattern).toHaveAttribute("x", "0");
    expect(pattern).toHaveAttribute("y", "0");
    expect(pattern).toHaveAttribute("width", "1");
    expect(pattern).toHaveAttribute("height", "1");
    expect(pattern).toHaveAttribute("viewBox", "0 0 120 70");
    expect(
      container.querySelector("[data-texture-transform]")
    ).toHaveAttribute(
      "transform",
      "translate(60 35) rotate(0) skewX(0) skewY(0) scale(1 1)"
    );
  });

  it("keeps non-repeating texture placement local when the object moves", () => {
    const texture = {
      ...DEFAULT_BITMAP_TEXTURE_FILL,
      height: 100,
      offsetX: 8,
      offsetY: -4,
      textureId: "monochrome.abstract.001",
      width: 150
    };
    const { container, rerender } = render(
      <svg>
        <BitmapTextureFillPattern
          element={rectangle}
          patternId="texture"
          source="texture.png"
          texture={texture}
        />
      </svg>
    );
    const getTransform = () =>
      container
        .querySelector("[data-texture-transform]")
        ?.getAttribute("transform");

    expect(getTransform()).toBe(
      "translate(68 31) rotate(0) skewX(0) skewY(0) scale(1 1)"
    );

    rerender(
      <svg>
        <BitmapTextureFillPattern
          element={{ ...rectangle, x: 500, y: 700 }}
          patternId="texture"
          source="texture.png"
          texture={texture}
        />
      </svg>
    );

    expect(getTransform()).toBe(
      "translate(68 31) rotate(0) skewX(0) skewY(0) scale(1 1)"
    );
  });

  it("mixes multiply continuously and exposes destination-out masking", () => {
    const { container } = render(
      <svg>
        <BitmapTextureFillPattern
          element={rectangle}
          patternId="texture"
          source="texture.png"
          texture={{
            ...DEFAULT_BITMAP_TEXTURE_FILL,
            destinationOutAmount: 75,
            multiplyAmount: 40,
            textureId: "monochrome.abstract.001"
          }}
        />
      </svg>
    );
    const normalImage = container.querySelector(
      'image[data-texture-blend="normal"]'
    );
    const multiplyImage = container.querySelector(
      'image[data-texture-blend="multiply"]'
    );

    expect(normalImage).toHaveAttribute("opacity", "1");
    expect(multiplyImage).toHaveAttribute("opacity", "0.4");
    expect(multiplyImage).toHaveStyle({ mixBlendMode: "multiply" });
    expect(
      container.querySelector("[data-bitmap-texture-filter]")
    ).toHaveAttribute("data-destination-out", "0.75");
    expect(
      container.querySelector('feComponentTransfer[result="compositeMask"] feFuncA')
    ).toHaveAttribute("slope", "-0.5");
  });
});
