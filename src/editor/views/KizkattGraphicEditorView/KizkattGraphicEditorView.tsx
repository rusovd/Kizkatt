import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import {
  CANVAS_TAB_INDEX,
  DEFAULT_GRADIENT_FILL,
  DEFAULT_SIMPLE_TRACE_SETTINGS,
  SINGLE_SELECTION_COUNT,
  SIMPLE_TRACE_PRESET_SETTINGS,
  canElementUseBackground,
  createBitmapTextureFillFromCatalogTexture,
  getBitmapTextureTargetTransform,
  getTextureCatalogEntries,
  traceSimpleBitmap
} from "kizkatt-graphic-engine";
import type {
  SimpleTraceRaster,
  SimpleTraceResult,
  SimpleTraceSettings,
  TextureCatalog,
  TextureCatalogTexture
} from "kizkatt-graphic-engine";

import {
  COLOR_PANEL_COLUMN_COUNT,
  DEFAULT_SELECT_TOOL,
  EMPTY_COLLECTION_LENGTH,
  TextEditor,
  useI18n,
  getStoredTextureCollectionId,
  getStoredTextureId,
  storeTextureCategoryId,
  storeTextureCollectionId,
  storeTextureId,
  FooterControls,
  Toolbar,
  EditorLoader,
  CanvasContextMenu,
  MainMenu,
  SceneFileFormatDialog,
  SceneLoadConfirmationDialog,
  SimpleTraceDialog,
  BitmapPatternFillPanel,
  GradientFillPanel,
  GradientLibraryPopover,
  ObjectPanel,
  StylingPanel,
  TextureLibraryPopover,
  type TextureImportRequest,
  useGraphicEditorSettings
} from "kizkatt-ui";
import { decodeImageForSimpleTrace } from "../../platform/decodeTraceImage";
import { useGradientPresetLibrary } from "../../state/useGradientPresetLibrary";
import {
  SELECTED_ELEMENT_STYLING_TOOLS,
  STYLING_TOOLS
} from "../../config/editorTools";
import type {
  StylingPanelProps,
  GradientPreset
} from "kizkatt-ui";
import type { KizkattGraphicEditorViewModel } from "../../controller/viewModel";

export type GraphicEditorTextureLibrary = {
  addTexture?: (request: TextureImportRequest) => TextureCatalogTexture;
  catalog: TextureCatalog;
  defaultCollectionId: string;
  getTextureById: (textureId: string) => TextureCatalogTexture | null;
  getTextureSource: (textureId: string) => string | null;
  getTextureThumbnailSource: (
    texture: TextureCatalogTexture
  ) => string | null;
};

export function KizkattGraphicEditorView({
  textureLibrary,
  viewModel
}: {
  textureLibrary: GraphicEditorTextureLibrary;
  viewModel: KizkattGraphicEditorViewModel;
}) {
  const {
    catalog: textureCatalog,
    addTexture,
    defaultCollectionId,
    getTextureById,
    getTextureSource,
    getTextureThumbnailSource
  } = textureLibrary;
  const textureCatalogEntries = useMemo(
    () => getTextureCatalogEntries(textureCatalog),
    [textureCatalog]
  );
  const textureEntryById = useMemo(
    () =>
      new Map(
        textureCatalogEntries.map((entry) => [
          entry.texture.id,
          entry
        ])
      ),
    [textureCatalogEntries]
  );
  const defaultTextureTypeName =
    textureCatalog.collections.find(
      (collection) => collection.id === defaultCollectionId
    )?.name ?? defaultCollectionId;
  const { strings } = useI18n();
  const { isPanelPinned } = useGraphicEditorSettings();
  const {
    boardBindings,
    canvas,
    commandControls,
    documentControls,
    imageInputBindings,
    selectionGeometryControls,
    simpleTraceControls,
    state,
    stylingControls,
    textEditing,
    toolControls,
    workspaceControls
  } = viewModel;
  const previewMode = state.activeDisplayMode === "preview";
  const objectPanelPinned = isPanelPinned("object-panel");
  const bitmapPatternPanelPinned = isPanelPinned("bitmap-pattern-fill");
  const gradientPanelPinned = isPanelPinned("gradient-fill");
  const [textureLibraryOpen, setTextureLibraryOpen] = useState(false);
  const [textureLibraryAnchor, setTextureLibraryAnchor] =
    useState<HTMLButtonElement | null>(null);
  const [textureLibraryReopenKey, setTextureLibraryReopenKey] = useState(0);
  const [bitmapPatternPanelOpen, setBitmapPatternPanelOpen] = useState(false);
  const [bitmapPatternPanelReopenKey, setBitmapPatternPanelReopenKey] =
    useState(0);
  const [gradientPanelOpen, setGradientPanelOpen] = useState(false);
  const [gradientPanelReopenKey, setGradientPanelReopenKey] = useState(0);
  const [gradientLibraryOpen, setGradientLibraryOpen] = useState(false);
  const [gradientLibraryAnchor, setGradientLibraryAnchor] =
    useState<HTMLButtonElement | null>(null);
  const [gradientLibraryReopenKey, setGradientLibraryReopenKey] = useState(0);
  const [simpleTraceOpen, setSimpleTraceOpen] = useState(false);
  const [simpleTraceDeleteOriginal, setSimpleTraceDeleteOriginal] =
    useState(false);
  const [simpleTraceError, setSimpleTraceError] = useState<string | null>(null);
  const [simpleTraceProcessing, setSimpleTraceProcessing] = useState(false);
  const [simpleTraceRaster, setSimpleTraceRaster] =
    useState<SimpleTraceRaster | null>(null);
  const [simpleTraceResult, setSimpleTraceResult] =
    useState<SimpleTraceResult | null>(null);
  const [simpleTraceSettings, setSimpleTraceSettings] =
    useState<SimpleTraceSettings>({ ...DEFAULT_SIMPLE_TRACE_SETTINGS });
  const {
    customPresets: customGradientPresets,
    deletePreset: deleteStoredGradientPreset,
    getRememberedPreset: getRememberedGradientPreset,
    rememberPreset: rememberGradientPreset,
    savePreset: saveStoredGradientPreset
  } = useGradientPresetLibrary();
  const lastSelectionGeometryControlsRef = useRef(selectionGeometryControls);
  const lastBitmapTextureRef = useRef(stylingControls.style.bitmapTexture);
  const previousBitmapTextureRef = useRef(
    stylingControls.style.bitmapTexture
  );
  const lastGradientRef = useRef(
    stylingControls.style.gradientFill ?? DEFAULT_GRADIENT_FILL
  );
  const previousGradientRef = useRef(stylingControls.style.gradientFill);
  const selectedBitmapTextureEntry = stylingControls.style.bitmapTexture
    ? textureEntryById.get(stylingControls.style.bitmapTexture.textureId)
    : undefined;

  useEffect(() => {
    if (!selectedBitmapTextureEntry) {
      return;
    }

    storeTextureCollectionId(selectedBitmapTextureEntry.collectionId);
    storeTextureCategoryId(
      selectedBitmapTextureEntry.collectionId,
      selectedBitmapTextureEntry.categoryId
    );
    storeTextureId(
      selectedBitmapTextureEntry.collectionId,
      selectedBitmapTextureEntry.texture.id
    );
  }, [selectedBitmapTextureEntry]);

  useEffect(() => {
    if (!simpleTraceOpen || !simpleTraceControls?.sourceElement.src) {
      setSimpleTraceRaster(null);
      return;
    }

    let cancelled = false;
    setSimpleTraceError(null);
    setSimpleTraceProcessing(true);
    setSimpleTraceResult(null);

    void decodeImageForSimpleTrace(simpleTraceControls.sourceElement.src)
      .then((raster) => {
        if (!cancelled) {
          setSimpleTraceRaster(raster);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSimpleTraceError(
            error instanceof Error
              ? error.message
              : "The bitmap could not be decoded."
          );
          setSimpleTraceProcessing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    simpleTraceControls?.sourceElement.id,
    simpleTraceControls?.sourceElement.src,
    simpleTraceOpen
  ]);

  useEffect(() => {
    if (!simpleTraceOpen || !simpleTraceRaster) {
      return;
    }

    let cancelled = false;
    setSimpleTraceProcessing(true);
    const timeout = window.setTimeout(() => {
      try {
        const result = traceSimpleBitmap(simpleTraceRaster, simpleTraceSettings);

        if (!cancelled) {
          setSimpleTraceResult(result);
          setSimpleTraceError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setSimpleTraceResult(null);
          setSimpleTraceError(
            error instanceof Error ? error.message : "The bitmap could not be traced."
          );
        }
      } finally {
        if (!cancelled) {
          setSimpleTraceProcessing(false);
        }
      }
    }, 80);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [simpleTraceOpen, simpleTraceRaster, simpleTraceSettings]);

  useEffect(() => {
    if (simpleTraceOpen && !simpleTraceControls) {
      setSimpleTraceOpen(false);
    }
  }, [simpleTraceControls, simpleTraceOpen]);

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
    (objectPanelPinned && lastSelectionGeometryControlsRef.current
      ? {
          ...lastSelectionGeometryControlsRef.current,
          activeTool: stylingControls.activeTool
        }
      : null);
  const visibleBitmapTexture =
    stylingControls.style.bitmapTexture ??
    lastBitmapTextureRef.current;
  const visibleBitmapCatalogTexture = visibleBitmapTexture
    ? getTextureById(visibleBitmapTexture.textureId)
    : null;
  const visibleBitmapTextureTypeName =
    (visibleBitmapTexture
      ? textureEntryById.get(visibleBitmapTexture.textureId)?.collectionName
      : undefined) ??
    defaultTextureTypeName;
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
  const bitmapTextureTargetSize = useMemo(
    () =>
      stylingControls.selectedElements.reduce(
        (size, element) => ({
          height: Math.max(size.height, Math.abs(element.height)),
          width: Math.max(size.width, Math.abs(element.width))
        }),
        { height: 0, width: 0 }
      ),
    [stylingControls.selectedElements]
  );
  const bitmapTextureTargetTransform = useMemo(
    () =>
      getBitmapTextureTargetTransform(
        stylingControls.selectedElements.length === SINGLE_SELECTION_COUNT
          ? stylingControls.selectedElements[0]
          : null
      ),
    [stylingControls.selectedElements]
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
    const currentTexture = stylingControls.style.bitmapTexture;
    const storedCollectionId = getStoredTextureCollectionId();
    const rememberedCollectionId = textureCatalog.collections.some(
      (collection) => collection.id === storedCollectionId
    )
      ? storedCollectionId
      : defaultCollectionId;
    const selectedTextureId = rememberedCollectionId
      ? getStoredTextureId(rememberedCollectionId)
      : null;
    const selectedCatalogTexture = selectedTextureId
      ? getTextureById(selectedTextureId)
      : null;
    const canApplyToCurrentTarget =
      stylingControls.selectedElements.length === EMPTY_COLLECTION_LENGTH ||
      stylingControls.selectedElements.every(canElementUseBackground);

    const rememberedTexture =
      lastBitmapTextureRef.current ??
      (selectedCatalogTexture
        ? createBitmapTextureFillFromCatalogTexture({
            targetSize: bitmapTextureTargetSize,
            texture: selectedCatalogTexture
          })
        : null);

    if (!currentTexture && rememberedTexture && canApplyToCurrentTarget) {
      applyBitmapTexture(rememberedTexture);
      stylingControls.onStyleChangeEnd();
    }

    setBitmapPatternPanelOpen(true);
    setBitmapPatternPanelReopenKey((value) => value + 1);
  };
  const openTextureLibrary = (anchor: HTMLButtonElement) => {
    setTextureLibraryAnchor(anchor);
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
    const rememberedPreset = getRememberedGradientPreset();
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

  useEffect(() => {
    const request = state.fillSettingsRequest;

    if (!request) {
      return;
    }

    if (request.fillStyle === "gradient") {
      openGradientPanel();
      return;
    }

    openBitmapPatternPanel();
  }, [state.fillSettingsRequest?.id]);

  const openGradientLibrary = (anchor: HTMLButtonElement) => {
    setGradientLibraryAnchor(anchor);
    setGradientLibraryOpen(true);
    setGradientLibraryReopenKey((value) => value + 1);
  };
  const saveGradientPreset = (
    gradient: NonNullable<StylingPanelProps["style"]["gradientFill"]>
  ) => {
    const preset = saveStoredGradientPreset(gradient);
    applyGradient(preset.gradient);
    stylingControls.onStyleChangeEnd();
  };
  const deleteGradientPreset = (preset: GradientPreset) => {
    if (!deleteStoredGradientPreset(preset)) {
      return;
    }

    if (visibleGradientFill.presetId === preset.id) {
      applyGradient({ ...visibleGradientFill, presetId: undefined });
      stylingControls.onStyleChangeEnd();
    }
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
      {!previewMode && (
        <Toolbar
          {...toolControls}
          canSimpleTrace={Boolean(simpleTraceControls)}
          onSimpleTrace={() => {
            if (!simpleTraceControls) {
              return;
            }

            setSimpleTraceDeleteOriginal(false);
            setSimpleTraceError(null);
            setSimpleTraceSettings({ ...DEFAULT_SIMPLE_TRACE_SETTINGS });
            setSimpleTraceOpen(true);
          }}
        />
      )}

      <input
        {...imageInputBindings}
        aria-label={strings.canvas.chooseImage}
        className="kizkatt-file-input"
        type="file"
      />

      {state.isLoading && <EditorLoader label={strings.canvas.loading} />}

      <CanvasContextMenu {...commandControls} />
      <MainMenu {...documentControls} />
      {documentControls.sceneReplacementAction && (
        <SceneLoadConfirmationDialog
          action={documentControls.sceneReplacementAction}
          onCancel={documentControls.onCancelSceneReplacement}
          onDiscard={documentControls.onConfirmSceneReplacementWithoutSaving}
          onSave={documentControls.onConfirmSaveAndReplaceScene}
        />
      )}
      {documentControls.formatDialogAction && (
        <SceneFileFormatDialog
          action={documentControls.formatDialogAction}
          onCancel={documentControls.onCancelFormatDialog}
          onChoose={documentControls.onChooseFormat}
        />
      )}
      {simpleTraceOpen && simpleTraceControls?.sourceElement.src && (
        <SimpleTraceDialog
          deleteOriginal={simpleTraceDeleteOriginal}
          error={simpleTraceError}
          imageName={
            simpleTraceControls.sourceElement.name ?? strings.toolbar.tools.image
          }
          imageSource={simpleTraceControls.sourceElement.src}
          onApply={() => {
            if (!simpleTraceResult) {
              return;
            }

            simpleTraceControls.onApply(
              simpleTraceResult,
              simpleTraceDeleteOriginal
            );
            setSimpleTraceOpen(false);
          }}
          onCancel={() => setSimpleTraceOpen(false)}
          onDeleteOriginalChange={setSimpleTraceDeleteOriginal}
          onReset={() =>
            setSimpleTraceSettings({ ...DEFAULT_SIMPLE_TRACE_SETTINGS })
          }
          onSettingsChange={(nextSettings) => {
            setSimpleTraceSettings((currentSettings) =>
              nextSettings.imagePreset === currentSettings.imagePreset
                ? nextSettings
                : {
                    ...nextSettings,
                    ...SIMPLE_TRACE_PRESET_SETTINGS[nextSettings.imagePreset]
                  }
            );
          }}
          processing={simpleTraceProcessing}
          result={simpleTraceResult}
          settings={simpleTraceSettings}
        />
      )}

      {showObjectPanel && visibleSelectionGeometryControls && (
        <ObjectPanel
          {...visibleSelectionGeometryControls}
          canToggleClosedPath={stylingControls.canToggleClosedPath}
          closedPath={stylingControls.closedPath}
          gradientFillPanelOpen={showGradientPanel}
          onClosedPathChange={stylingControls.onClosedPathChange}
          onGradientOpen={openGradientPanel}
          onTextureFillOpen={openBitmapPatternPanel}
          textureFillPanelOpen={showBitmapPatternPanel}
        />
      )}
      {showStylingPanel && (
        <StylingPanel
          {...stylingControls}
          colorColumnCount={COLOR_PANEL_COLUMN_COUNT}
        />
      )}
      {!previewMode && textureLibraryOpen && (
        <TextureLibraryPopover
          activeTexture={stylingControls.style.bitmapTexture}
          anchorElement={textureLibraryAnchor}
          catalog={textureCatalog}
          getTextureById={getTextureById}
          getTextureThumbnailSource={getTextureThumbnailSource}
          initialCollectionId={defaultCollectionId}
          onClose={() => setTextureLibraryOpen(false)}
          onTextureChange={(texture) => {
            applyBitmapTexture(texture);
            stylingControls.onStyleChangeEnd();
            setTextureLibraryOpen(false);
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
          onImportTexture={(request) => {
            if (!addTexture) {
              throw new Error("Texture imports are not configured.");
            }

            return addTexture(request);
          }}
          onOpenLibrary={openTextureLibrary}
          reopenKey={bitmapPatternPanelReopenKey}
          resolveTextureSource={getTextureSource}
          targetSize={bitmapTextureTargetSize}
          targetTransform={bitmapTextureTargetTransform}
          texture={visibleBitmapTexture}
          textureCollections={textureCatalog.collections}
          textureMetadata={visibleBitmapCatalogTexture ?? undefined}
          textureTypeName={visibleBitmapTextureTypeName}
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
      {!previewMode && gradientLibraryOpen && (
        <GradientLibraryPopover
          activeGradient={visibleGradientFill}
          anchorElement={gradientLibraryAnchor}
          customPresets={customGradientPresets}
          onClose={() => setGradientLibraryOpen(false)}
          onGradientDelete={deleteGradientPreset}
          onGradientChange={(preset) => {
            rememberGradientPreset(preset.id);
            applyGradient(preset.gradient);
            stylingControls.onStyleChangeEnd();
            setGradientLibraryOpen(false);
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
