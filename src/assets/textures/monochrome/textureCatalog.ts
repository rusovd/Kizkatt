import catalogJson from "./catalog.json";
import type {
  TextureCatalog,
  TextureCatalogTexture
} from "kizkatt-graphic-engine";

export type {
  TextureCatalog,
  TextureCatalogCategory,
  TextureCatalogCollection,
  TextureCatalogTexture
} from "kizkatt-graphic-engine";

const textureAssetUrls = import.meta.glob(
  [
    "./*/*.{avif,bmp,gif,jpeg,jpg,png,svg,webp}",
    "./*/*.{AVIF,BMP,GIF,JPEG,JPG,PNG,SVG,WEBP}",
    "./*/thumbnails/*.{avif,bmp,gif,jpeg,jpg,png,svg,webp}",
    "./*/thumbnails/*.{AVIF,BMP,GIF,JPEG,JPG,PNG,SVG,WEBP}"
  ],
  {
    eager: true,
    import: "default",
    query: "?url"
  }
) as Record<string, string>;

const LEGACY_MONOCHROME_TEXTURE_ID_PREFIX = "bw.abstract.";
const MONOCHROME_TEXTURE_ID_PREFIX = "monochrome.abstract.";
export const MONOCHROME_TEXTURE_COLLECTION_ID = "monochrome";

export function normalizeMonochromeTextureId(textureId: string) {
  return textureId.startsWith(LEGACY_MONOCHROME_TEXTURE_ID_PREFIX)
    ? textureId.replace(
        LEGACY_MONOCHROME_TEXTURE_ID_PREFIX,
        MONOCHROME_TEXTURE_ID_PREFIX
      )
    : textureId;
}

export const textureCatalog = catalogJson as TextureCatalog;
const textureById = new Map(
  textureCatalog.collections.flatMap((collection) =>
    collection.categories.flatMap((category) =>
      category.textures.map((texture) => [texture.id, texture] as const)
    )
  )
);

export function getTextureAssetUrl(texture: TextureCatalogTexture) {
  return textureAssetUrls[`./${texture.file}`] ?? null;
}

export function getTextureThumbnailUrl(texture: TextureCatalogTexture) {
  return texture.thumbnail
    ? textureAssetUrls[`./${texture.thumbnail}`] ?? getTextureAssetUrl(texture)
    : getTextureAssetUrl(texture);
}

export function getTextureById(textureId: string) {
  return textureById.get(normalizeMonochromeTextureId(textureId)) ?? null;
}

export function getTextureSource(textureId: string) {
  const texture = getTextureById(textureId);

  return texture ? getTextureAssetUrl(texture) : null;
}
