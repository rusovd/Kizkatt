import type { GraphicEditorTextureLibrary } from "../views/KizkattGraphicEditorView/KizkattGraphicEditorView";

import {
  getTextureById,
  getTextureSource,
  getTextureThumbnailUrl,
  MONOCHROME_TEXTURE_COLLECTION_ID,
  textureCatalog
} from "../../assets/textures/monochrome/textureCatalog";
import {
  getSvgTextureSource,
  svgTextureCatalog
} from "../../assets/svg-fills/svgFillCatalog";

function resolveTextureSource(textureId: string) {
  return getTextureSource(textureId) ?? getSvgTextureSource(textureId);
}

export const graphicEditorTextureLibrary: GraphicEditorTextureLibrary = {
  catalog: textureCatalog,
  defaultCollectionId: MONOCHROME_TEXTURE_COLLECTION_ID,
  getTextureById,
  getTextureSource: resolveTextureSource,
  getTextureThumbnailSource: getTextureThumbnailUrl,
  svgTextures: svgTextureCatalog
};
