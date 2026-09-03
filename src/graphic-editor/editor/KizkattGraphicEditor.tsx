import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import {
  ARROW_MARKER_HEIGHT,
  ARROW_MARKER_ORIENT,
  ARROW_MARKER_PATH,
  ARROW_MARKER_REF_X,
  ARROW_MARKER_REF_Y,
  ARROW_MARKER_VIEW_BOX,
  ARROW_MARKER_WIDTH,
  CANVAS_TAB_INDEX,
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_CANVAS_BACKGROUND_BY_THEME,
  DEFAULT_ELEMENT_STYLE_BY_THEME,
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_COLOR_BY_THEME,
  DEFAULT_GRADIENT_FILL,
  PERCENT_MAX_VALUE,
  TEXT_ELEMENT_DEFAULT_HEIGHT,
  TEXT_ELEMENT_DEFAULT_WIDTH,
  canElementUseBackground,
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
  createCustomGradientPreset,
  createBitmapTextureFillFromCatalogTexture,
  DEFAULT_GRADIENT_PRESETS,
  getStoredCustomGradientPresets,
  getStoredGradientPresetId,
  getStoredTextureId,
  KizkattGraphicEditorController,
  storeCustomGradientPresets,
  storeGradientPresetId,
  type GradientPreset,
  type KizkattGraphicEditorCanvasViewModel,
  type KizkattGraphicEditorViewModel,
  type ObjectPanelProps,
  type StylingPanelProps,
  type TextEditorProps
} from "kizkatt-graphic-editor";
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
import { StylingPanel } from "../ui/panels/StylePanel";
import { BitmapPatternFillPanel } from "../ui/panels/BitmapPatternFillPanel";
import { TextureLibraryPopover } from "../ui/panels/TextureLibraryPopover";
import { GradientFillPanel } from "../ui/panels/GradientFillPanel";
import { GradientLibraryPopover } from "../ui/panels/GradientLibraryPopover";
import {
  ELEMENT_NAMING,
  ELEMENT_TOOL_BY_TYPE,
  SELECTED_ELEMENT_STYLING_TOOLS,
  STYLING_TOOLS
} from "../tools/toolRegistry";
import { Toolbar } from "../ui/controls/Toolbar";
import { I18nProvider, useI18n } from "../i18n";
import { GraphicEditorSettingsProvider } from "../ui/settings/GraphicEditorSettings";
import { useGraphicEditorSettings } from "../ui/settings/GraphicEditorSettings";
import { EditorLoader } from "../ui/feedback/EditorLoader";
import {
  getTextureById,
  MONOCHROME_TEXTURE_COLLECTION_ID
} from "../assets/textures/monochrome/textureCatalog";
import { SceneElement } from "../controller/SceneElement";
import {
  ImagePlacementPreview,
  TransformPreview
} from "../preview/PreviewOverlays";

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

function AppStylingPanel(
  props: StylingPanelProps & {
    onGradientOpen: () => void;
    onMonochromeTextureOpen: () => void;
  }
) {
  return (
    <StylingPanel
      {...props}
      colorColumnCount={COLOR_PANEL_COLUMN_COUNT}
    />
  );
}

function AppObjectPanel(props: ObjectPanelProps) {
  return <ObjectPanel {...props} />;
}

function AppCanvas({
  viewModel
}: {
  viewModel: KizkattGraphicEditorCanvasViewModel;
}) {
  const {
    activeDisplayMode,
    arrowMarkerId,
    canvasAriaLabel,
    canvasBackgroundColor,
    canvasClassName,
    canvasCursor,
    canvasState,
    displayElements,
    getElementSelectionRenderState,
    gridColor,
    gridSettings,
    imagePlacementBounds,
    infoMode,
    infoOverlayItems,
    interaction,
    onContextMenu,
    onDoubleClick,
    onPointerDown,
    onPointerLeave,
    onPointerMove,
    onPointerUp,
    pan,
    previewTransformInteraction,
    selectedElements,
    selectionTransformCenter,
    selectionTransformMode,
    showGrid,
    showRotateHandle,
    svgRef,
    zoom
  } = viewModel;

  return (
    <svg
      ref={svgRef}
      className={canvasClassName}
      role="application"
      aria-label={canvasAriaLabel}
      style={
        {
          "--kizkatt-canvas-grid": gridColor,
          backgroundColor:
            activeDisplayMode === "wireframe"
              ? "var(--kizkatt-wireframe-canvas)"
              : canvasBackgroundColor,
          cursor: canvasCursor
        } as CSSProperties
      }
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onContextMenu={onContextMenu}
    >
      <CanvasGrid
        gridSettings={gridSettings}
        pan={pan}
        visible={showGrid}
        zoom={zoom}
      />
      <defs>
        <marker
          id={arrowMarkerId}
          viewBox={ARROW_MARKER_VIEW_BOX}
          refX={ARROW_MARKER_REF_X}
          refY={ARROW_MARKER_REF_Y}
          markerWidth={ARROW_MARKER_WIDTH}
          markerHeight={ARROW_MARKER_HEIGHT}
          orient={ARROW_MARKER_ORIENT}
        >
          <path d={ARROW_MARKER_PATH} />
        </marker>
      </defs>
      <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
        {displayElements.map((element) => {
          const { options } = getElementSelectionRenderState(element);

          return (
            <SceneElement
              key={element.id}
              element={element}
              options={options}
              renderElement={renderElement}
              selected={false}
            />
          );
        })}
        {!previewTransformInteraction &&
          selectedElements.map((element) => {
            const { options, showInternalOverlay, showPrimaryOverlay } =
              getElementSelectionRenderState(element);

            if (showPrimaryOverlay) {
              return renderElementOverlay(element, {
                ...options,
                overlayVariant: "primary"
              });
            }

            if (showInternalOverlay) {
              return renderElementOverlay(element, {
                ...options,
                overlayVariant: "internal"
              });
            }

            return null;
          })}
        {imagePlacementBounds && (
          <ImagePlacementPreview bounds={imagePlacementBounds} />
        )}
        <SelectionArea interaction={interaction} />
        {previewTransformInteraction && (
          <TransformPreview
            elements={canvasState.elements}
            selectedIds={previewTransformInteraction.selectedIds}
            wireframe={activeDisplayMode === "wireframe"}
          />
        )}
        {infoMode && <InfoOverlay items={infoOverlayItems} zoom={zoom} />}
        {!previewTransformInteraction && (
          <SelectedBounds
            elements={selectedElements}
            interaction={interaction}
            selectionTransformCenter={selectionTransformCenter}
            selectionTransformMode={selectionTransformMode}
            showRotateHandle={showRotateHandle}
            showRotateHoverIcon={interaction?.type !== "rotate"}
          />
        )}
      </g>
    </svg>
  );
}

function renderAppCanvas(viewModel: KizkattGraphicEditorCanvasViewModel) {
  return <AppCanvas viewModel={viewModel} />;
}

function KizkattGraphicEditorView({
  viewModel
}: {
  viewModel: KizkattGraphicEditorViewModel;
}) {
  const { strings } = useI18n();
  const { isPanelPinned } = useGraphicEditorSettings();
  const {
    boardBindings,
    canvas,
    commandControls,
    documentControls,
    imageInputBindings,
    selectionGeometryControls,
    state,
    stylingControls,
    textEditing,
    toolControls,
    workspaceControls
  } = viewModel;
  const previewMode = state.activeDisplayMode === "preview";
  const objectPanelPinned = isPanelPinned("object-panel");
  const bitmapPatternPanelPinned = isPanelPinned("bitmap-pattern-fill");
  const textureLibraryPinned = isPanelPinned("texture-library");
  const gradientPanelPinned = isPanelPinned("gradient-fill");
  const gradientLibraryPinned = isPanelPinned("gradient-library");
  const [textureLibraryOpen, setTextureLibraryOpen] = useState(false);
  const [textureLibraryReopenKey, setTextureLibraryReopenKey] = useState(0);
  const [bitmapPatternPanelOpen, setBitmapPatternPanelOpen] = useState(false);
  const [bitmapPatternPanelReopenKey, setBitmapPatternPanelReopenKey] =
    useState(0);
  const [gradientPanelOpen, setGradientPanelOpen] = useState(false);
  const [gradientPanelReopenKey, setGradientPanelReopenKey] = useState(0);
  const [gradientLibraryOpen, setGradientLibraryOpen] = useState(false);
  const [gradientLibraryReopenKey, setGradientLibraryReopenKey] = useState(0);
  const [customGradientPresets, setCustomGradientPresets] = useState<
    GradientPreset[]
  >(() => getStoredCustomGradientPresets());
  const lastSelectionGeometryControlsRef = useRef(selectionGeometryControls);
  const lastBitmapTextureRef = useRef(stylingControls.style.bitmapTexture);
  const previousBitmapTextureRef = useRef(
    stylingControls.style.bitmapTexture
  );
  const lastGradientRef = useRef(
    stylingControls.style.gradientFill ?? DEFAULT_GRADIENT_FILL
  );
  const previousGradientRef = useRef(stylingControls.style.gradientFill);

  useEffect(() => {
    if (
      previousBitmapTextureRef.current &&
      !stylingControls.style.bitmapTexture
    ) {
      setBitmapPatternPanelOpen(false);
    }

    previousBitmapTextureRef.current = stylingControls.style.bitmapTexture;
  }, [stylingControls.style.bitmapTexture]);

  useEffect(() => {
    if (
      previousGradientRef.current &&
      !stylingControls.style.gradientFill
    ) {
      setGradientPanelOpen(false);
    }

    previousGradientRef.current = stylingControls.style.gradientFill;
  }, [stylingControls.style.gradientFill]);

  if (selectionGeometryControls) {
    lastSelectionGeometryControlsRef.current = selectionGeometryControls;
  }

  if (stylingControls.style.bitmapTexture) {
    lastBitmapTextureRef.current = stylingControls.style.bitmapTexture;
  }

  if (stylingControls.style.gradientFill) {
    lastGradientRef.current = stylingControls.style.gradientFill;
  }

  const visibleSelectionGeometryControls =
    selectionGeometryControls ??
    (objectPanelPinned ? lastSelectionGeometryControlsRef.current : null);
  const visibleBitmapTexture =
    stylingControls.style.bitmapTexture ??
    lastBitmapTextureRef.current;
  const showObjectPanel =
    !previewMode &&
    (!state.menuOpen || objectPanelPinned) &&
    Boolean(visibleSelectionGeometryControls);
  const stylingPanelIsRelevant =
    STYLING_TOOLS.has(stylingControls.activeTool) ||
    (stylingControls.selectedElements.length > EMPTY_COLLECTION_LENGTH &&
      (stylingControls.activeTool === DEFAULT_SELECT_TOOL ||
        SELECTED_ELEMENT_STYLING_TOOLS.has(stylingControls.activeTool)));
  const showStylingPanel =
    !previewMode &&
    ((!state.menuOpen && stylingPanelIsRelevant) ||
      isPanelPinned("style-panel"));
  const showBitmapPatternPanel =
    !previewMode &&
    (bitmapPatternPanelPinned || bitmapPatternPanelOpen);
  const showGradientPanel =
    !previewMode && (gradientPanelPinned || gradientPanelOpen);
  const visibleGradientFill =
    stylingControls.style.gradientFill ?? lastGradientRef.current;
  const bitmapTextureTargetSize = stylingControls.selectedElements.reduce(
    (size, element) => ({
      height: Math.max(size.height, Math.abs(element.height)),
      width: Math.max(size.width, Math.abs(element.width))
    }),
    { height: 0, width: 0 }
  );
  const applyBitmapTexture = (
    texture: NonNullable<StylingPanelProps["style"]["bitmapTexture"]>,
    options?: { transient?: boolean }
  ) => {
    stylingControls.onStyleChange(
      {
        bitmapTexture: texture,
        fillStyle: "monochromeTexture"
      },
      options
    );
  };
  const openBitmapPatternPanel = () => {
    const selectedTextureId = getStoredTextureId(
      MONOCHROME_TEXTURE_COLLECTION_ID
    );
    const selectedCatalogTexture = selectedTextureId
      ? getTextureById(selectedTextureId)
      : null;
    const canApplyToCurrentTarget =
      stylingControls.selectedElements.length === EMPTY_COLLECTION_LENGTH ||
      stylingControls.selectedElements.every(canElementUseBackground);

    if (selectedCatalogTexture && canApplyToCurrentTarget) {
      const currentTexture = stylingControls.style.bitmapTexture;
      const texture =
        currentTexture?.textureId === selectedCatalogTexture.id
          ? currentTexture
          : createBitmapTextureFillFromCatalogTexture({
              targetSize: bitmapTextureTargetSize,
              texture: selectedCatalogTexture
            });

      applyBitmapTexture(texture);
      stylingControls.onStyleChangeEnd();
    }

    setBitmapPatternPanelOpen(true);
    setBitmapPatternPanelReopenKey((value) => value + 1);
  };
  const openTextureLibrary = () => {
    setTextureLibraryOpen(true);
    setTextureLibraryReopenKey((value) => value + 1);
  };
  const applyGradient = (
    gradient: NonNullable<StylingPanelProps["style"]["gradientFill"]>,
    options?: { transient?: boolean }
  ) => {
    lastGradientRef.current = gradient;
    stylingControls.onStyleChange(
      { gradientFill: gradient, fillStyle: "gradient" },
      options
    );
  };
  const openGradientPanel = () => {
    const allPresets = [
      ...DEFAULT_GRADIENT_PRESETS,
      ...customGradientPresets
    ];
    const rememberedPresetId = getStoredGradientPresetId();
    const rememberedPreset = allPresets.find(
      (preset) => preset.id === rememberedPresetId
    );
    const canApplyToCurrentTarget =
      stylingControls.selectedElements.length === EMPTY_COLLECTION_LENGTH ||
      stylingControls.selectedElements.every(canElementUseBackground);
    const gradient =
      stylingControls.style.gradientFill ??
      rememberedPreset?.gradient ??
      lastGradientRef.current;

    if (canApplyToCurrentTarget) {
      applyGradient(gradient);
      stylingControls.onStyleChangeEnd();
    }

    setGradientPanelOpen(true);
    setGradientPanelReopenKey((value) => value + 1);
  };
  const openGradientLibrary = () => {
    setGradientLibraryOpen(true);
    setGradientLibraryReopenKey((value) => value + 1);
  };
  const saveGradientPreset = (
    gradient: NonNullable<StylingPanelProps["style"]["gradientFill"]>
  ) => {
    const preset = createCustomGradientPreset(gradient);
    const nextPresets = [...customGradientPresets, preset];
    setCustomGradientPresets(nextPresets);
    storeCustomGradientPresets(nextPresets);
    storeGradientPresetId(preset.id);
    applyGradient(preset.gradient);
    stylingControls.onStyleChangeEnd();
  };

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

      {showObjectPanel && visibleSelectionGeometryControls && (
        <AppObjectPanel {...visibleSelectionGeometryControls} />
      )}
      {showStylingPanel && (
        <AppStylingPanel
          {...stylingControls}
          onGradientOpen={openGradientPanel}
          onMonochromeTextureOpen={openBitmapPatternPanel}
        />
      )}
      {!previewMode && (textureLibraryOpen || textureLibraryPinned) && (
        <TextureLibraryPopover
          activeTexture={stylingControls.style.bitmapTexture}
          initialCollectionId={MONOCHROME_TEXTURE_COLLECTION_ID}
          onClose={() => setTextureLibraryOpen(false)}
          onTextureChange={(texture) => {
            applyBitmapTexture(texture);
            stylingControls.onStyleChangeEnd();
            if (!textureLibraryPinned) {
              setTextureLibraryOpen(false);
            }
          }}
          reopenKey={textureLibraryReopenKey}
          targetSize={bitmapTextureTargetSize}
        />
      )}
      {showBitmapPatternPanel && (
        <BitmapPatternFillPanel
          onChange={applyBitmapTexture}
          onChangeEnd={stylingControls.onStyleChangeEnd}
          onClose={() => setBitmapPatternPanelOpen(false)}
          onOpenLibrary={openTextureLibrary}
          reopenKey={bitmapPatternPanelReopenKey}
          targetSize={bitmapTextureTargetSize}
          texture={visibleBitmapTexture}
        />
      )}
      {showGradientPanel && (
        <GradientFillPanel
          gradient={visibleGradientFill}
          onChange={applyGradient}
          onChangeEnd={stylingControls.onStyleChangeEnd}
          onClose={() => setGradientPanelOpen(false)}
          onOpenLibrary={openGradientLibrary}
          onSavePreset={saveGradientPreset}
          reopenKey={gradientPanelReopenKey}
        />
      )}
      {!previewMode && (gradientLibraryOpen || gradientLibraryPinned) && (
        <GradientLibraryPopover
          activeGradient={visibleGradientFill}
          customPresets={customGradientPresets}
          onClose={() => setGradientLibraryOpen(false)}
          onGradientChange={(preset) => {
            storeGradientPresetId(preset.id);
            applyGradient(preset.gradient);
            stylingControls.onStyleChangeEnd();
            if (!gradientLibraryPinned) setGradientLibraryOpen(false);
          }}
          reopenKey={gradientLibraryReopenKey}
        />
      )}
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
      defaultElementStyleByTheme={DEFAULT_ELEMENT_STYLE_BY_THEME}
      naming={ELEMENT_NAMING}
      getToolForSelectedElement={(element) =>
        ELEMENT_TOOL_BY_TYPE[element.type]
      }
      getCanvasCursor={getCanvasCursor}
      renderCanvas={renderAppCanvas}
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
