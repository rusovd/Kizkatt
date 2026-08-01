import {
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_ELEMENT_STYLE_BY_THEME,
  DEFAULT_GRID_COLOR,
  KizkattGraphicEditor as EngineKizkattGraphicEditor,
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
  stopDrawingEngineShortcuts,
  storeCanvasBackgroundColor,
  storeCustomCanvasBackgroundColor,
  storeGridColor,
  storeTheme,
  storeUiScale,
  type StylePanelProps,
  type TextEditorProps
} from "kizkatt-graphic-engine";

import {
  CanvasGrid,
  getCanvasCursor,
  SelectedBounds,
  SelectionArea,
  renderElement,
  serializeSvg
} from "../ui/canvas";
import { CanvasContextMenu } from "../ui/menus/CanvasContextMenu";
import { FooterControls } from "../ui/controls/FooterControls";
import { MainMenu } from "../ui/menus/MainMenu";
import { StylePanel } from "../ui/panels/StylePanel";
import { STYLE_TOOLS } from "../tools/toolRegistry";
import { Toolbar } from "../ui/controls/Toolbar";
import { GraphicEditorSettingsProvider } from "../ui/settings/GraphicEditorSettings";

const COLOR_PANEL_COLUMN_COUNT = 5;

export {
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_GRID_COLOR,
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
  return (
    <textarea
      aria-label="Edit text"
      autoFocus
      className="kizkatt-text-editor"
      onBlur={onBlur}
      onChange={(event) => onChange(event.target.value)}
      style={{
        color: element.strokeColor,
        height: Math.max(36, element.height * zoom),
        left: pan.x + element.x * zoom,
        opacity: element.opacity / 100,
        top: pan.y + element.y * zoom,
        width: Math.max(128, element.width * zoom)
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

const editorComponents = {
  CanvasContextMenu,
  CanvasGrid,
  FooterControls,
  MainMenu,
  SelectedBounds,
  SelectionArea,
  StylePanel: AppStylePanel,
  TextEditor,
  Toolbar
};

export function KizkattGraphicEditor() {
  return (
    <GraphicEditorSettingsProvider>
      <EngineKizkattGraphicEditor
        components={editorComponents}
        defaultElementStyleByTheme={DEFAULT_ELEMENT_STYLE_BY_THEME}
        getCanvasCursor={getCanvasCursor}
        renderElement={renderElement}
        serializeSvg={serializeSvg}
        shouldShowStylePanel={({ activeTool, selectedElements }) =>
          selectedElements.length > 0 || STYLE_TOOLS.has(activeTool)
        }
      />
    </GraphicEditorSettingsProvider>
  );
}
