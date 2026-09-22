import { useCallback } from "react";
import { DEFAULT_ELEMENT_STYLE_BY_THEME } from "kizkatt-graphic-engine";
import {
  getCanvasCursor,
  type KizkattGraphicEditorCanvasViewModel,
  useI18n
} from "kizkatt-ui";

import { renderEditorCanvas } from "../../adapters/renderEditorCanvas";
import { graphicEditorTextureLibrary } from "../../config/textureLibrary";
import { ELEMENT_TOOL_BY_TYPE } from "../../config/editorTools";
import { KizkattGraphicEditorController } from "../../controller/KizkattGraphicEditorController";
import { KizkattGraphicEditorView } from "../../views/KizkattGraphicEditorView/KizkattGraphicEditorView";
import { useCustomTextureLibrary } from "../../state/useCustomTextureLibrary";

export function KizkattGraphicEditorContent() {
  const { strings } = useI18n();
  const textureLibrary = useCustomTextureLibrary(
    graphicEditorTextureLibrary
  );
  const renderCanvas = useCallback(
    (viewModel: KizkattGraphicEditorCanvasViewModel) =>
      renderEditorCanvas(viewModel, textureLibrary.getTextureSource),
    [textureLibrary.getTextureSource]
  );

  return (
    <KizkattGraphicEditorController
      canvasAriaLabel={strings.canvas.canvasAriaLabel}
      defaultElementStyleByTheme={DEFAULT_ELEMENT_STYLE_BY_THEME}
      naming={{
        elementNameByType: strings.elementNames,
        groupName: strings.groupNames.default
      }}
      getToolForSelectedElement={(element) =>
        ELEMENT_TOOL_BY_TYPE[element.type]
      }
      getCanvasCursor={getCanvasCursor}
      renderCanvas={renderCanvas}
    >
      {(viewModel) => (
        <KizkattGraphicEditorView
          textureLibrary={textureLibrary}
          viewModel={viewModel}
        />
      )}
    </KizkattGraphicEditorController>
  );
}
