import {
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_CANVAS_BACKGROUND_BY_THEME,
  DEFAULT_ELEMENT_STYLE_BY_THEME,
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_COLOR_BY_THEME,
  PERCENT_MAX_VALUE,
  KizkattGraphicEditor as EngineKizkattGraphicEditor,
  TEXT_ELEMENT_DEFAULT_HEIGHT,
  TEXT_ELEMENT_DEFAULT_WIDTH,
  findElementAtPoint,
  getElementIdsInSelectionArea,
  getResizeAnchorPoint,
  getResizeCursor,
  getStoredCanvasBackgroundColor,
  getStoredCustomCanvasBackgroundColor,
  getStoredGridColor,
  getStoredTheme,
  getStoredUiScale,
  reorderElementsByLayerAction,
  resizeElementFromHandle,
  resizeElementsFromSelectionHandle,
  rotateElementsAroundPoint,
  skewElementsFromSelectionHandle,
  stopDrawingEngineShortcuts,
  storeCanvasBackgroundColor,
  storeCustomCanvasBackgroundColor,
  storeGridColor,
  storeTheme,
  storeUiScale,
  type ObjectPanelProps,
  type StylePanelProps,
  type TextEditorProps
} from "kizkatt-graphic-engine";

import {
  COLOR_PANEL_COLUMN_COUNT,
  DEFAULT_SELECT_TOOL,
  EMPTY_COLLECTION_LENGTH
} from "../config/constants";
import {
  CanvasGrid,
  getCanvasCursor,
  SelectedBounds,
  SelectionArea,
  renderElement,
  renderElementOverlay,
  serializeSvg
} from "../ui/canvas";
import { CanvasContextMenu } from "../ui/menus/CanvasContextMenu";
import { FooterControls } from "../ui/controls/FooterControls";
import { MainMenu } from "../ui/menus/MainMenu";
import { ObjectPanel } from "../ui/panels/ObjectPanel";
import { StylePanel } from "../ui/panels/StylePanel";
import {
  ELEMENT_NAMING,
  ELEMENT_TOOL_BY_TYPE,
  SELECTED_ELEMENT_STYLE_TOOLS,
  STYLE_TOOLS
} from "../tools/toolRegistry";
import { Toolbar } from "../ui/controls/Toolbar";
import { I18nProvider, useI18n } from "../i18n";
import { GraphicEditorSettingsProvider } from "../ui/settings/GraphicEditorSettings";

export {
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_CANVAS_BACKGROUND_BY_THEME,
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_COLOR_BY_THEME,
  findElementAtPoint,
  getElementIdsInSelectionArea,
  getResizeAnchorPoint,
  getResizeCursor,
  getStoredCanvasBackgroundColor,
  getStoredCustomCanvasBackgroundColor,
  getStoredGridColor,
  getStoredTheme,
  getStoredUiScale,
  reorderElementsByLayerAction,
  resizeElementFromHandle,
  resizeElementsFromSelectionHandle,
  rotateElementsAroundPoint,
  skewElementsFromSelectionHandle,
  stopDrawingEngineShortcuts,
  storeCanvasBackgroundColor,
  storeCustomCanvasBackgroundColor,
  storeGridColor,
  storeTheme,
  storeUiScale
};
export type { ResizeHandle } from "kizkatt-graphic-engine";

function TextEditor({
  element,
  onBlur,
  onChange,
  pan,
  zoom
}: TextEditorProps) {
  const { strings } = useI18n();

  return (
    <textarea
      aria-label={strings.canvas.editText}
      autoFocus
      className="kizkatt-text-editor"
      onBlur={onBlur}
      onChange={(event) => onChange(event.target.value)}
      style={{
        color: element.strokeColor,
        height: Math.max(TEXT_ELEMENT_DEFAULT_HEIGHT, element.height * zoom),
        left: pan.x + element.x * zoom,
        opacity: element.opacity / PERCENT_MAX_VALUE,
        top: pan.y + element.y * zoom,
        width: Math.max(TEXT_ELEMENT_DEFAULT_WIDTH, element.width * zoom)
      }}
      value={element.text}
    />
  );
}

function AppStylePanel(props: StylePanelProps) {
  return (
    <StylePanel
      {...props}
      colorColumnCount={COLOR_PANEL_COLUMN_COUNT}
    />
  );
}

function AppObjectPanel(props: ObjectPanelProps) {
  return <ObjectPanel {...props} />;
}

const editorComponents = {
  CanvasContextMenu,
  CanvasGrid,
  FooterControls,
  MainMenu,
  ObjectPanel: AppObjectPanel,
  SelectedBounds,
  SelectionArea,
  StylePanel: AppStylePanel,
  TextEditor,
  Toolbar
};

function KizkattGraphicEditorContent() {
  const { strings } = useI18n();

  return (
    <EngineKizkattGraphicEditor
      boardAriaLabel={strings.canvas.boardAriaLabel}
      canvasAriaLabel={strings.canvas.canvasAriaLabel}
      components={editorComponents}
      defaultElementStyleByTheme={DEFAULT_ELEMENT_STYLE_BY_THEME}
      imageInputAriaLabel={strings.canvas.chooseImage}
      naming={ELEMENT_NAMING}
      getToolForSelectedElement={(element) =>
        ELEMENT_TOOL_BY_TYPE[element.type]
      }
      getCanvasCursor={getCanvasCursor}
      renderElement={renderElement}
      renderElementOverlay={renderElementOverlay}
      serializeSvg={serializeSvg}
      shouldShowStylePanel={({ activeTool, selectedElements }) =>
        STYLE_TOOLS.has(activeTool) ||
        (selectedElements.length > EMPTY_COLLECTION_LENGTH &&
          (activeTool === DEFAULT_SELECT_TOOL ||
            SELECTED_ELEMENT_STYLE_TOOLS.has(activeTool)))
      }
    />
  );
}

export function KizkattGraphicEditor() {
  return (
    <I18nProvider>
      <GraphicEditorSettingsProvider>
        <KizkattGraphicEditorContent />
      </GraphicEditorSettingsProvider>
    </I18nProvider>
  );
}
