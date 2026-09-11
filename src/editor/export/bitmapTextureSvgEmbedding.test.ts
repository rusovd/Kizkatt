import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_BITMAP_TEXTURE_FILL,
  type KizkattElement
} from "kizkatt-graphic-engine";

import { embedBitmapTextureFragmentsInSvg } from "./bitmapTextureSvgEmbedding";

describe("embedBitmapTextureFragmentsInSvg", () => {
  it("replaces a catalog texture with an object-sized embedded fragment", async () => {
    const bitmapTexture = {
      ...DEFAULT_BITMAP_TEXTURE_FILL,
      brightness: -20,
      brightnessEnabled: true,
      height: 900,
      name: "Stone 001",
      rotation: 24,
      textureId: "monochrome.stone.001",
      width: 1600
    };
    const element: KizkattElement = {
      angle: Math.PI / 6,
      backgroundColor: "transparent",
      bitmapTexture,
      fillStyle: "monochromeTexture",
      height: 80,
      id: "textured-object",
      opacity: 100,
      skewX: Math.PI / 12,
      strokeColor: "#000000",
      strokeStyle: "solid",
      strokeWidth: 2,
      type: "rectangle",
      width: 120,
      x: 40,
      y: 50
    };
    const metadata = JSON.stringify({
      bitmapTexture,
      fillStyle: "monochromeTexture",
      id: element.id
    });
    const markup = `<svg xmlns="http://www.w3.org/2000/svg">
      <g data-element-id="textured-object">
        <metadata>${metadata}</metadata>
        <defs>
          <pattern id="kizkatt-fill-textured-object" data-bitmap-texture="monochrome.stone.001">
            <image href="/assets/full-stone-texture.jpg" width="1600" height="900" />
          </pattern>
        </defs>
        <rect x="40" y="50" width="120" height="80" fill="url(#kizkatt-fill-textured-object)" />
      </g>
    </svg>`;
    const croppedSource = "data:image/png;base64,b2JqZWN0LWZyYWdtZW50";
    const rasterize = vi.fn().mockResolvedValue(croppedSource);

    const result = await embedBitmapTextureFragmentsInSvg(
      markup,
      [element],
      { pixelRatio: 2, rasterize }
    );
    const document = new DOMParser().parseFromString(
      result,
      "image/svg+xml"
    );
    const pattern = document.querySelector("pattern");
    const embeddedImage = pattern?.querySelector("image");
    const exportedMetadata = JSON.parse(
      document.querySelector("metadata")?.textContent ?? "{}"
    ) as { bitmapTexture?: typeof bitmapTexture };

    expect(rasterize).toHaveBeenCalledWith(
      expect.objectContaining({ id: "kizkatt-fill-textured-object" }),
      element,
      2
    );
    expect(result).not.toContain("full-stone-texture.jpg");
    expect(pattern?.getAttribute("patternUnits")).toBe("objectBoundingBox");
    expect(pattern?.getAttribute("viewBox")).toBe("0 0 120 80");
    expect(embeddedImage?.getAttribute("href")).toBe(croppedSource);
    expect(exportedMetadata.bitmapTexture).toMatchObject({
      brightness: DEFAULT_BITMAP_TEXTURE_FILL.brightness,
      brightnessEnabled: false,
      desaturateEnabled: false,
      fitToObject: true,
      height: 80,
      name: "Stone 001",
      rotation: 0,
      source: croppedSource,
      textureId: "embedded:textured-object:monochrome.stone.001",
      transparencyEnabled: false,
      width: 120
    });
  });

  it("inlines ordinary external bitmap resources in portable SVG output", async () => {
    const dataUrl = "data:image/png;base64,cG9ydGFibGU=";
    const fetchMock = vi.fn().mockResolvedValue({
      blob: vi.fn().mockResolvedValue(new Blob(["portable"])),
      ok: true
    });
    class StubFileReader {
      onerror: (() => void) | null = null;
      onload: (() => void) | null = null;
      result: string | null = null;

      readAsDataURL() {
        this.result = dataUrl;
        this.onload?.();
      }
    }
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("FileReader", StubFileReader);

    try {
      const result = await embedBitmapTextureFragmentsInSvg(
        '<svg xmlns="http://www.w3.org/2000/svg"><image href="/images/photo.png" /></svg>',
        []
      );

      expect(fetchMock).toHaveBeenCalledWith("/images/photo.png");
      expect(result).toContain(dataUrl);
      expect(result).not.toContain("/images/photo.png");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
