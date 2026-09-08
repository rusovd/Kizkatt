import type { KizkattGraphicEditorCanvasViewModel } from "kizkatt-ui";
import { EditorCanvas, TextureSourceProvider } from "kizkatt-ui";

import { getTextureSource } from "../../assets/textures/monochrome/textureCatalog";

export function renderEditorCanvas(
  viewModel: KizkattGraphicEditorCanvasViewModel
) {
  return (
    <TextureSourceProvider resolveTextureSource={getTextureSource}>
      <EditorCanvas viewModel={viewModel} />
    </TextureSourceProvider>
  );
}
