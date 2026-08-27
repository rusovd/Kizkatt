import catalogJson from "./catalog.json";
import type {
  TextureCatalog,
  TextureCatalogTexture
} from "kizkatt-graphic-editor";
import { findTextureCatalogTexture } from "kizkatt-graphic-editor";

export type {
  TextureCatalog,
  TextureCatalogCategory,
  TextureCatalogCollection,
  TextureCatalogTexture
} from "kizkatt-graphic-editor";

const textureAssetUrls = import.meta.glob(
  [
    "./Abstract/*.{avif,bmp,gif,jpeg,jpg,png,svg,webp}",
    "./Abstract/*.{AVIF,BMP,GIF,JPEG,JPG,PNG,SVG,WEBP}",
    "./Abstract/thumbnails/*.{avif,bmp,gif,jpeg,jpg,png,svg,webp}",
    "./Abstract/thumbnails/*.{AVIF,BMP,GIF,JPEG,JPG,PNG,SVG,WEBP}"
  ],
  {
    eager: true,
    import: "default",
    query: "?url"
  }
) as Record<string, string>;

const PORTRAIT_ABSTRACT_TEXTURES = new Set([
  "002",
  "003",
  "007",
  "011",
  "026",
  "027",
  "028",
  "034"
]);
const LEGACY_MONOCHROME_TEXTURE_ID_PREFIX = "bw.abstract.";
const MONOCHROME_TEXTURE_ID_PREFIX = "monochrome.abstract.";

export function normalizeMonochromeTextureId(textureId: string) {
  return textureId.startsWith(LEGACY_MONOCHROME_TEXTURE_ID_PREFIX)
    ? textureId.replace(
        LEGACY_MONOCHROME_TEXTURE_ID_PREFIX,
        MONOCHROME_TEXTURE_ID_PREFIX
      )
    : textureId;
}

function getKnownTextureSize(file: string) {
  const abstractMatch = /Abstract_(\d{3})\.jpg$/i.exec(file);

  if (!abstractMatch) {
    return {};
  }

  return PORTRAIT_ABSTRACT_TEXTURES.has(abstractMatch[1])
    ? { height: 7360, width: 4912 }
    : { height: 4912, width: 7360 };
}

function getDiscoveredTextureName(file: string) {
  const filename = file.split("/").at(-1) ?? file;

  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getDiscoveredTextureId(file: string) {
  return `${MONOCHROME_TEXTURE_ID_PREFIX}${file
    .toLocaleLowerCase()
    .replace(/^abstract\//, "")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

function addDiscoveredAbstractTextures(catalog: TextureCatalog) {
  const discoveredTextures = Object.keys(textureAssetUrls)
    .map((path) => path.replace(/^\.\//, ""))
    .filter((path) => !path.startsWith("Abstract/thumbnails/"))
    .sort((left, right) => left.localeCompare(right));

  if (discoveredTextures.length === 0) {
    return catalog;
  }

  return {
    ...catalog,
    collections: catalog.collections.map((collection) => ({
      ...collection,
      categories: collection.categories.map((category) => {
        if (collection.id !== "monochrome" || category.id !== "abstract") {
          return category;
        }

        const catalogFiles = new Set(
          category.textures.map((texture) => texture.file)
        );
        const discoveredEntries = discoveredTextures
          .filter((file) => !catalogFiles.has(file))
          .map((file) => ({
            file,
            id: getDiscoveredTextureId(file),
            name: getDiscoveredTextureName(file),
            thumbnail: file.replace(
              /^Abstract\//,
              "Abstract/thumbnails/"
            )
          }));

        return {
          ...category,
          textures: [...category.textures, ...discoveredEntries].map(
            (texture) => ({
              ...texture,
              ...getKnownTextureSize(texture.file)
            })
          )
        };
      })
    }))
  };
}

export const textureCatalog = addDiscoveredAbstractTextures(
  catalogJson as TextureCatalog
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
  return findTextureCatalogTexture(
    textureCatalog,
    normalizeMonochromeTextureId(textureId)
  );
}

export function getTextureSource(textureId: string) {
  const texture = getTextureById(textureId);

  return texture ? getTextureAssetUrl(texture) : null;
}
