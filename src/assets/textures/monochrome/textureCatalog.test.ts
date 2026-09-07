import { describe, expect, it } from "vitest";

import {
  getTextureAssetUrl,
  getTextureThumbnailUrl,
  textureCatalog
} from "./textureCatalog";

const EXPECTED_CATEGORY_SIZES = {
  abstract: 34,
  light: 13,
  metal: 46,
  paper: 19,
  stone: 147,
  textile: 12,
  wet: 55,
  wood: 32
};

describe("monochrome texture catalog", () => {
  it("catalogs every texture category with source and thumbnail assets", () => {
    const categories = textureCatalog.collections[0].categories;

    expect(
      Object.fromEntries(
        categories.map((category) => [category.id, category.textures.length])
      )
    ).toEqual(EXPECTED_CATEGORY_SIZES);

    for (const category of categories) {
      for (const texture of category.textures) {
        expect(texture.width).toBeGreaterThan(0);
        expect(texture.height).toBeGreaterThan(0);
        expect(getTextureAssetUrl(texture)).not.toBeNull();
        expect(getTextureThumbnailUrl(texture)).not.toBeNull();
      }
    }
  });
});
