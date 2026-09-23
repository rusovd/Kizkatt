import { describe, expect, it } from "vitest";
import type { TextureCatalog } from "kizkatt-graphic-engine";

import {
  createStoredCustomTexture,
  mergeCustomTexturesIntoCatalog
} from "./useCustomTextureLibrary";

const catalog: TextureCatalog = {
  version: 1,
  collections: [
    {
      id: "monochrome",
      name: "Monochrome",
      categories: [
        {
          id: "wood",
          name: "Wood",
          textures: [
            {
              file: "Wood/Wood_009.jpg",
              id: "monochrome.wood.wood-009",
              name: "Wood 009"
            }
          ]
        }
      ]
    }
  ]
};

describe("custom texture library", () => {
  it("keeps source metadata and assigns the next category number", () => {
    const storedTexture = createStoredCustomTexture({
      catalog,
      request: {
        author: "Ada Artist",
        categoryId: "wood",
        collectionId: "monochrome",
        from: "https://example.com/wood",
        naturalSize: { height: 800, width: 1200 },
        originalFileName: "pexels-original.PNG",
        source: "data:image/png;base64,texture"
      }
    });

    expect(storedTexture.source).toBe("data:image/png;base64,texture");
    expect(storedTexture.texture).toMatchObject({
      author: "Ada Artist",
      custom: true,
      file: "Wood/Wood_010.png",
      from: "https://example.com/wood",
      height: 800,
      name: "Wood 010",
      originalFileName: "pexels-original.PNG",
      width: 1200
    });

    const nextTexture = createStoredCustomTexture({
      catalog: mergeCustomTexturesIntoCatalog(catalog, [storedTexture]),
      request: {
        author: "",
        categoryId: "wood",
        collectionId: "monochrome",
        from: "",
        naturalSize: { height: 10, width: 10 },
        originalFileName: "another.jpg",
        source: "data:image/jpeg;base64,texture"
      }
    });

    expect(nextTexture.texture.name).toBe("Wood 011");
  });

  it("creates a local texture type and group with numbering from 001", () => {
    const storedTexture = createStoredCustomTexture({
      catalog,
      request: {
        author: "",
        categoryName: "Ткань и нити",
        collectionName: "Color Textures",
        from: "",
        naturalSize: { height: 640, width: 640 },
        originalFileName: "source.webp",
        source: "data:image/webp;base64,texture"
      }
    });
    const mergedCatalog = mergeCustomTexturesIntoCatalog(catalog, [
      storedTexture
    ]);
    const createdCollection = mergedCatalog.collections.find(
      (collection) => collection.id === "color-textures"
    );
    const createdCategory = createdCollection?.categories.find(
      (category) => category.id === "ткань-и-нити"
    );

    expect(storedTexture.texture.name).toBe("Ткань и нити 001");
    expect(createdCollection?.name).toBe("Color Textures");
    expect(createdCategory?.textures).toContain(storedTexture.texture);
  });
});
