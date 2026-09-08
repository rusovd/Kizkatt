import type { GraphicEditorTextureLibrary } from "../views/KizkattGraphicEditorView/KizkattGraphicEditorView";

import {
  getTextureById,
  getTextureSource,
  getTextureThumbnailUrl,
  MONOCHROME_TEXTURE_COLLECTION_ID,
  textureCatalog
} from "../../assets/textures/monochrome/textureCatalog";

export const graphicEditorTextureLibrary: GraphicEditorTextureLibrary = {
  catalog: textureCatalog,
  defaultCollectionId: MONOCHROME_TEXTURE_COLLECTION_ID,
  getTextureById,
  getTextureSource,
  getTextureThumbnailSource: getTextureThumbnailUrl
};
