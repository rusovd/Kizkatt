import {
  DEFAULT_ELEMENT_STYLE_BY_THEME,
  serializeSvg
} from "kizkatt-graphic-engine";
import {
  getCanvasCursor,
  useI18n
} from "kizkatt-ui";

import { renderEditorCanvas } from "../../adapters/renderEditorCanvas";
import { graphicEditorTextureLibrary } from "../../config/textureLibrary";
import { ELEMENT_TOOL_BY_TYPE } from "../../config/editorTools";
import { KizkattGraphicEditorController } from "../../controller/KizkattGraphicEditorController";
import { KizkattGraphicEditorView } from "../../views/KizkattGraphicEditorView/KizkattGraphicEditorView";

export function KizkattGraphicEditorContent() {
  const { strings } = useI18n();

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
      renderCanvas={renderEditorCanvas}
      serializeSvg={serializeSvg}
    >
      {(viewModel) => (
        <KizkattGraphicEditorView
          textureLibrary={graphicEditorTextureLibrary}
          viewModel={viewModel}
        />
      )}
    </KizkattGraphicEditorController>
  );
}
