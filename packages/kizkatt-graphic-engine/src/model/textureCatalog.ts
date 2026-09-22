export type TextureCatalogTexture = {
  author?: string;
  custom?: boolean;
  file: string;
  from?: string;
  height?: number;
  id: string;
  name: string;
  originalFileName?: string;
  thumbnail?: string;
  width?: number;
};

export type TextureCatalogCategory = {
  id: string;
  name: string;
  textures: TextureCatalogTexture[];
};

export type TextureCatalogCollection = {
  categories: TextureCatalogCategory[];
  id: string;
  name: string;
};

export type TextureCatalog = {
  collections: TextureCatalogCollection[];
  version: number;
};

export type TextureCatalogEntry = {
  categoryId: string;
  categoryName: string;
  collectionId: string;
  collectionName: string;
  texture: TextureCatalogTexture;
};

export function createBitmapTextureFillFromCatalogTexture({
  base,
  targetSize,
  texture
}: {
  base?: BitmapTextureFill;
  targetSize: BitmapTextureSize;
  texture: TextureCatalogTexture;
}) {
  return createBitmapTextureFill({
    base,
    name: texture.name,
    naturalSize: {
      height: texture.height ?? DEFAULT_BITMAP_TEXTURE_FILL.height,
      width: texture.width ?? DEFAULT_BITMAP_TEXTURE_FILL.width
    },
    source: undefined,
    targetSize,
    textureId: texture.id
  });
}

export function getTextureCatalogEntries(
  catalog: TextureCatalog
): TextureCatalogEntry[] {
  return catalog.collections.flatMap((collection) =>
    collection.categories.flatMap((category) =>
      category.textures.map((texture) => ({
        categoryId: category.id,
        categoryName: category.name,
        collectionId: collection.id,
        collectionName: collection.name,
        texture
      }))
    )
  );
}

export function filterTextureCatalogEntries(
  entries: readonly TextureCatalogEntry[],
  {
    categoryId,
    collectionId,
    search
  }: { categoryId: string; collectionId: string; search: string }
): TextureCatalogEntry[] {
  const normalizedSearch = search.trim().toLocaleLowerCase();

  return entries.filter(
    (entry) =>
      (collectionId === "all" || entry.collectionId === collectionId) &&
      (categoryId === "all" || entry.categoryId === categoryId) &&
      (!normalizedSearch ||
        [
          entry.texture.name,
          entry.texture.originalFileName,
          entry.texture.author,
          entry.texture.from
        ].some((value) =>
          value?.toLocaleLowerCase().includes(normalizedSearch)
        ))
  );
}

export function groupTextureCatalogEntries(
  entries: readonly TextureCatalogEntry[]
): Map<string, TextureCatalogEntry[]> {
  return entries.reduce<Map<string, TextureCatalogEntry[]>>((groups, entry) => {
    const key = `${entry.collectionId}:${entry.categoryId}`;
    const group = groups.get(key);

    if (group) {
      group.push(entry);
    } else {
      groups.set(key, [entry]);
    }

    return groups;
  }, new Map());
}

export function findTextureCatalogTexture(
  catalog: TextureCatalog,
  textureId: string
): TextureCatalogTexture | null {
  for (const collection of catalog.collections) {
    for (const category of collection.categories) {
      const texture = category.textures.find((entry) => entry.id === textureId);

      if (texture) {
        return texture;
      }
    }
  }

  return null;
}
import { DEFAULT_BITMAP_TEXTURE_FILL } from "../config/constants";
import {
  createBitmapTextureFill,
  type BitmapTextureSize
} from "../geometry/bitmapTextures";
import type { BitmapTextureFill } from "./types";
