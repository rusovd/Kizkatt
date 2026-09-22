import type {
  KizkattGraphicEditorCanvasViewModel,
  TextureSourceResolver
} from "kizkatt-ui";
import { EditorCanvas, TextureSourceProvider } from "kizkatt-ui";

import { getTextureSource } from "../../assets/textures/monochrome/textureCatalog";

export function renderEditorCanvas(
  viewModel: KizkattGraphicEditorCanvasViewModel,
  resolveTextureSource: TextureSourceResolver = getTextureSource
) {
  return (
    <TextureSourceProvider resolveTextureSource={resolveTextureSource}>
      <EditorCanvas viewModel={viewModel} />
    </TextureSourceProvider>
  );
}
