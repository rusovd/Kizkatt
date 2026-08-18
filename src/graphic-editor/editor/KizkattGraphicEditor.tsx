import type { CSSProperties } from "react";

import {
  CANVAS_TAB_INDEX,
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_CANVAS_BACKGROUND_BY_THEME,
  DEFAULT_ELEMENT_STYLE_BY_THEME,
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_COLOR_BY_THEME,
  PERCENT_MAX_VALUE,
  TEXT_ELEMENT_DEFAULT_HEIGHT,
  TEXT_ELEMENT_DEFAULT_WIDTH,
  findElementAtPoint,
  getElementIdsInSelectionArea,
  getResizeAnchorPoint,
  getResizeCursor,
  reorderElementsByLayerAction,
  resizeElementFromHandle,
  resizeElementsFromSelectionHandle,
  rotateElementsAroundPoint,
  skewElementsFromSelectionHandle
} from "kizkatt-graphic-engine";
import {
  KizkattGraphicEditorController,
  type KizkattGraphicEditorViewModel,
  type ObjectPanelProps,
  type StylePanelProps,
  type TextEditorProps
} from "../controller/KizkattGraphicEditorController";
import {
  getStoredCanvasBackgroundColor,
  getStoredCustomCanvasBackgroundColor,
  getStoredGridColor,
  getStoredTheme,
  getStoredUiScale,
  storeCanvasBackgroundColor,
  storeCustomCanvasBackgroundColor,
  storeGridColor,
  storeTheme,
  storeUiScale
} from "../platform/storage";
import { stopDrawingEngineShortcuts } from "../platform/keyboard";

import {
  COLOR_PANEL_COLUMN_COUNT,
  DEFAULT_SELECT_TOOL,
  EMPTY_COLLECTION_LENGTH
} from "../config/constants";
import {
  CanvasGrid,
  getCanvasCursor,
  InfoOverlay,
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
import { EditorLoader } from "../ui/feedback/EditorLoader";

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

const canvasComponents = {
  CanvasGrid,
  InfoOverlay,
  SelectedBounds,
  SelectionArea
};

function KizkattGraphicEditorView({
  viewModel
}: {
  viewModel: KizkattGraphicEditorViewModel;
}) {
  const { strings } = useI18n();
  const {
    boardBindings,
    canvas,
    commandControls,
    documentControls,
    imageInputBindings,
    selectionGeometryControls,
    state,
    styleControls,
    textEditing,
    toolControls,
    workspaceControls
  } = viewModel;
  const previewMode = state.activeDisplayMode === "preview";
  const showObjectPanel =
    !previewMode &&
    !state.menuOpen &&
    Boolean(selectionGeometryControls);
  const showStylePanel =
    !previewMode &&
    !state.menuOpen &&
    (STYLE_TOOLS.has(styleControls.activeTool) ||
      (styleControls.selectedElements.length > EMPTY_COLLECTION_LENGTH &&
        (styleControls.activeTool === DEFAULT_SELECT_TOOL ||
          SELECTED_ELEMENT_STYLE_TOOLS.has(styleControls.activeTool))));

  return (
    <section
      {...boardBindings}
      aria-label={strings.canvas.boardAriaLabel}
      className={[
        "kizkatt-board",
        `kizkatt-board--${state.theme}`,
        state.activeDisplayMode
          ? `kizkatt-board--${state.activeDisplayMode}`
          : ""
      ]
        .filter(Boolean)
        .join(" ")}
      aria-busy={state.isLoading}
      style={{ "--kizkatt-ui-scale": state.uiScale } as CSSProperties}
      tabIndex={CANVAS_TAB_INDEX}
    >
      {!previewMode && <Toolbar {...toolControls} />}

      <input
        {...imageInputBindings}
        aria-label={strings.canvas.chooseImage}
        className="kizkatt-file-input"
        type="file"
      />

      {state.isLoading && <EditorLoader label={strings.canvas.loading} />}

      <CanvasContextMenu {...commandControls} />
      <MainMenu {...documentControls} />

      {showObjectPanel && selectionGeometryControls && (
        <AppObjectPanel {...selectionGeometryControls} />
      )}
      {showStylePanel && <AppStylePanel {...styleControls} />}
      {textEditing && <TextEditor {...textEditing} />}

      {canvas}

      <FooterControls {...workspaceControls} />
    </section>
  );
}

function KizkattGraphicEditorContent() {
  const { strings } = useI18n();

  return (
    <KizkattGraphicEditorController
      canvasAriaLabel={strings.canvas.canvasAriaLabel}
      components={canvasComponents}
      defaultElementStyleByTheme={DEFAULT_ELEMENT_STYLE_BY_THEME}
      naming={ELEMENT_NAMING}
      getToolForSelectedElement={(element) =>
        ELEMENT_TOOL_BY_TYPE[element.type]
      }
      getCanvasCursor={getCanvasCursor}
      renderElement={renderElement}
      renderElementOverlay={renderElementOverlay}
      serializeSvg={serializeSvg}
    >
      {(viewModel) => (
        <KizkattGraphicEditorView viewModel={viewModel} />
      )}
    </KizkattGraphicEditorController>
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
