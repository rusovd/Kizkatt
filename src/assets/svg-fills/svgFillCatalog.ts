import {
  createSvgTextureDataUrl,
  type SvgTextureOption
} from "kizkatt-ui";

const svgTextureAssetCode = import.meta.glob("./*.svg", {
  eager: true,
  import: "default",
  query: "?raw"
}) as Record<string, string>;

function getTextureName(fileName: string) {
  return fileName
    .replace(/\.svg$/i, "")
    .split("-")
    .filter(Boolean)
    .map((part) => `${part[0]?.toLocaleUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

export const svgTextureCatalog: readonly SvgTextureOption[] = Object.entries(
  svgTextureAssetCode
)
  .map(([path, code]) => {
    const fileName = path.slice(path.lastIndexOf("/") + 1);
    const slug = fileName.replace(/\.svg$/i, "");

    return {
      code,
      id: `svg.${slug}`,
      name: getTextureName(fileName),
      source: createSvgTextureDataUrl(code)
    };
  })
  .sort((first, second) => first.name.localeCompare(second.name));

const svgTextureById = new Map(
  svgTextureCatalog.map((texture) => [texture.id, texture] as const)
);

export function getSvgTextureSource(textureId: string) {
  return svgTextureById.get(textureId)?.source ?? null;
}
