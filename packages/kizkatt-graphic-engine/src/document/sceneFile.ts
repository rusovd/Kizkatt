import {
  createKizkattSceneArchive,
  extractKizkattSceneArchive,
  isKizkattSceneArchive
} from "./sceneArchive";
import {
  KIZKATT_SCENE_FILE_EXTENSION,
  KIZKATT_SCENE_JSON_MIME_TYPE,
  KIZKATT_SCENE_MIME_TYPE
} from "./sceneDocument";
import { SVG_IMAGE_MIME_TYPE } from "../config/constants";

export type SceneFileFormat = "kk" | "svg";

export const DEFAULT_SCENE_FILE_NAME = "something";
export const SVG_FILE_EXTENSION = ".svg";

export function getSceneFileFormat(fileName: string): SceneFileFormat | null {
  const normalizedName = fileName.toLowerCase();

  if (normalizedName.endsWith(KIZKATT_SCENE_FILE_EXTENSION)) {
    return "kk";
  }

  return normalizedName.endsWith(SVG_FILE_EXTENSION) ? "svg" : null;
}

export function getSceneFileExtension(format: SceneFileFormat) {
  return format === "svg"
    ? SVG_FILE_EXTENSION
    : KIZKATT_SCENE_FILE_EXTENSION;
}

export function getSceneFileMimeType(
  format: SceneFileFormat,
  archiveKk = true
) {
  if (format === "svg") {
    return SVG_IMAGE_MIME_TYPE;
  }

  return archiveKk ? KIZKATT_SCENE_MIME_TYPE : KIZKATT_SCENE_JSON_MIME_TYPE;
}

export function normalizeSceneFileBaseName(value?: string) {
  const baseName = (value?.trim() || DEFAULT_SCENE_FILE_NAME)
    .replace(/\.(?:kk|svg)$/i, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .trim();

  return baseName || DEFAULT_SCENE_FILE_NAME;
}

export async function encodeSceneFileContents({
  archiveKk = true,
  contents,
  fileName,
  format
}: {
  archiveKk?: boolean;
  contents: string;
  fileName: string;
  format: SceneFileFormat;
}) {
  if (format === "svg" || !archiveKk) {
    return contents;
  }

  return createKizkattSceneArchive(contents, fileName);
}

export async function decodeSceneFileContents({
  contents,
  format
}: {
  contents: string | Uint8Array;
  format: SceneFileFormat;
}) {
  if (format === "svg") {
    return {
      archived: false,
      contents: typeof contents === "string"
        ? contents
        : new TextDecoder().decode(contents)
    };
  }

  const bytes = typeof contents === "string"
    ? new TextEncoder().encode(contents)
    : contents;
  const archived = isKizkattSceneArchive(bytes);

  return {
    archived,
    contents: archived
      ? await extractKizkattSceneArchive(bytes)
      : typeof contents === "string"
        ? contents
        : new TextDecoder().decode(bytes)
  };
}
