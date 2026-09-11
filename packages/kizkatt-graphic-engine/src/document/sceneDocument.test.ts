import { describe, expect, it } from "vitest";

import {
  DEFAULT_BITMAP_TEXTURE_FILL,
  DEFAULT_ELEMENT_STYLE_BY_THEME
} from "../config/constants";
import { addKizkattSvgMetadata, KIZKATT_SVG_DESCRIPTION } from "../export/svgExport";
import type { KizkattElement } from "../model/types";
import {
  createDefaultKizkattSceneSettings,
  createKizkattSceneDocument,
  getKizkattDocumentCanvasState,
  parseKizkattSceneDocument,
  serializeKizkattSceneDocument
} from "./sceneDocument";

function createRectangle(
  id: string,
  overrides: Partial<KizkattElement> = {}
): KizkattElement {
  return {
    ...DEFAULT_ELEMENT_STYLE_BY_THEME.dark,
    angle: 0,
    height: 80,
    id,
    name: `Rectangle ${id}`,
    type: "rectangle",
    width: 120,
    x: 40,
    y: 50,
    ...overrides
  };
}

describe("Kizkatt scene documents", () => {
  it("round-trips ordered elements, scene settings, metadata, and resource paths", () => {
    const created = "2026-08-12T08:00:00.000Z";
    const source = "/assets/textures/monochrome/Stone/Stone 001.jpg";
    const elements = [
      createRectangle("first", {
        bitmapTexture: {
          ...DEFAULT_BITMAP_TEXTURE_FILL,
          name: "Stone 001",
          source,
          textureId: "monochrome.stone.001"
        },
        fillStyle: "monochromeTexture"
      }),
      createRectangle("second", { x: 220 })
    ];
    const settings = createDefaultKizkattSceneSettings({
      dpi: 300,
      showGrid: false,
      theme: "light",
      units: "px"
    });
    const document = createKizkattSceneDocument({
      canvasState: { elements, selectedIds: ["first"] },
      now: created,
      settings,
      user: "test"
    });

    expect(Object.keys(document.kk.scene.Objects)).toEqual([
      "Object_000001",
      "Object_000002"
    ]);
    expect(document.kk.scene.Objects.Object_000001).toMatchObject({
      layer: 1,
      bitmapTexture: { source }
    });
    expect(document.kk.meta).toMatchObject({
      changed: created,
      created,
      user: "test"
    });

    const parsed = parseKizkattSceneDocument(
      serializeKizkattSceneDocument(document)
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.kk.scene.Settings).toMatchObject({
      dpi: 300,
      showGrid: false,
      theme: "light",
      units: "px"
    });
    expect(getKizkattDocumentCanvasState(parsed!)).toMatchObject({
      elements: [
        { id: "first", bitmapTexture: { source } },
        { id: "second", x: 220 }
      ],
      selectedIds: []
    });
  });

  it("rejects malformed files", () => {
    expect(parseKizkattSceneDocument("not json")).toBeNull();
    expect(parseKizkattSceneDocument('{"kk":{}}')).toBeNull();
  });
});

describe("Kizkatt SVG metadata", () => {
  it("marks exported SVG files as created with Kizkatt", () => {
    const result = addKizkattSvgMetadata(
      '<svg xmlns="http://www.w3.org/2000/svg"><rect /></svg>',
      { created: "2026-08-12T08:00:00.000Z" }
    );
    const document = new DOMParser().parseFromString(result, "image/svg+xml");
    const metadata = JSON.parse(
      document.querySelector("metadata")?.textContent ?? "{}"
    ) as { created?: string; description?: string; generator?: string };

    expect(metadata).toEqual({
      created: "2026-08-12T08:00:00.000Z",
      description: KIZKATT_SVG_DESCRIPTION,
      generator: "Kizkatt"
    });
  });
});
