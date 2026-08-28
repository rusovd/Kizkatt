import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent
} from "react";

import {
  DEFAULT_ELEMENT_STYLE_BY_THEME,
  DEFAULT_ARROW_MARKER_ID,
  DEFAULT_CANVAS_ARIA_LABEL,
  DEFAULT_EDGE_STYLE,
  DEFAULT_FILL_STYLE,
  DEFAULT_FILL_WEIGHT,
  DEFAULT_SHOW_ROTATE_HANDLE,
  DEFAULT_ZOOM,
  DEFAULT_SELECTED_SLOPPINESS,
  DEFAULT_STROKE_WIDTH,
  EMPTY_COLLECTION_LENGTH,
  EMPTY_INPUT_VALUE,
  DEFAULT_IMAGE_SIZE,
  IMAGE_LOAD_FALLBACK_TIMEOUT_MS,
  IMAGE_FILE_ACCEPT,
  IMAGE_MIME_TYPE_PREFIX,
  INITIAL_PAN,
  MIN_ELEMENT_SIZE,
  MAX_ZOOM,
  MIN_PIXEL_SIZE,
  MIN_ZOOM,
  PASTED_TEXT_CHARACTER_WIDTH,
  PASTED_TEXT_LINE_HEIGHT,
  PASTED_TEXT_MAX_WIDTH,
  PLAIN_TEXT_MIME_TYPE,
  PNG_IMAGE_MIME_TYPE,
  RENDER_OVERSCAN_PX,
  SINGLE_SELECTION_COUNT,
  TEXT_ELEMENT_DEFAULT_HEIGHT,
  TEXT_ELEMENT_DEFAULT_WIDTH,
  TRANSPARENT_COLOR,
  VIEWPORT_CENTER_DIVISOR,
  ZOOM_STEP
} from "kizkatt-graphic-engine";
import {
  createElement,
  withUpdatedObjectBase
} from "kizkatt-graphic-engine";
import {
  createElementName as buildElementName,
  normalizeElementNames
} from "kizkatt-graphic-engine";
import {
  canGroupSelection,
  canUngroupSelection,
  expandElementIdsToGroups
} from "kizkatt-graphic-engine";
import {
  getElementBends,
  getElementIndicesInBounds,
  getGridWorldSizing,
  reorderElementsByLayerAction,
  resizeElementsFromSelectionHandle,
  rotateElementsAroundPoint,
  selectionBounds
} from "kizkatt-graphic-engine";
import {
  isAllowedEditingShortcut,
  isEditableKeyboardTarget,
  stopDrawingEngineShortcuts,
  EDITING_SHORTCUT_KEY,
  EDITOR_KEY
} from "../platform/keyboard";
import { useCanvasHistory } from "../hooks/useCanvasHistory";
import {
  getStoredCanvasBackgroundColor,
  getStoredCanvasState,
  getStoredCustomCanvasBackgroundColor,
  getStoredDpi,
  getStoredGridColor,
  getStoredGridSettings,
  getStoredContextMenuDefaults,
  getStoredQuickCanvasState,
  getStoredTheme,
  getStoredUiScale,
  normalizeGridSettings,
  storeCanvasBackgroundColor,
  storeCanvasState,
  storeCustomCanvasBackgroundColor,
  storeDpi,
  storeGridColor,
  storeGridSettings,
  storeQuickCanvasState,
  storeTheme,
  storeUiScale
} from "../platform/storage";
import { useToolPointerHandlers } from "../tools/pointer";
import type {
  ContextMenuState,
  Dpi,
  GridSettings,
  KizkattElement,
  SelectionTransformMode,
  Point,
  SelectionAreaMode,
  StyleState,
  KizkattTheme,
  Tool
} from "kizkatt-graphic-engine";
import {
  copySelectionAsPng,
  copySelectionAsSvg
} from "../export/clipboardExport";
import {
  COPIED_PNG_EXPORT_SIZE_TTL_MS,
  getFittedImageSize,
  getImageSize,
  isExpectedCopiedPngSize,
  type CopiedPngExport,
  type Size
} from "kizkatt-graphic-engine";
import {
  getActiveInteractionCursor,
  getImagePlacementBounds,
  getPreviewDisplayElements,
  isPreviewTransformInteraction
} from "../preview/interaction";
import {
  isBreakApartableSvgElement,
  parseSvgCode
} from "kizkatt-graphic-engine";
import { breakApartSvgElement } from "kizkatt-graphic-engine";
import type {
  KizkattGraphicEditorControllerProps,
  KizkattRenderElementOptions,
  EditorDisplayMode,
  ObjectGeometryPatch,
  ObjectMirrorAxis
} from "./types";
import {
  applyStylePatch,
  changesImageBorderStyle,
  getExclusiveFillStylePatch,
  hasOwnStyleProperty,
  isSameStyle
} from "./style";
import {
  DEFAULT_OBJECT_GEOMETRY_PERCENT,
  getBoundsCenter,
  getElementFromBase,
  getObjectPanelGeometry,
  mirrorElementAroundPoint,
  RADIANS_PER_DEGREE,
  SELECTION_SCALE_HANDLE,
  translateElement
} from "./objectCommands";
import {
  breakApartCanvasSelection,
  cloneElementsIntoCanvas,
  groupCanvasSelection,
  revertObjectBases,
  selectAllElements,
  ungroupCanvasSelection,
  updateObjectBases
} from "./selectionCommands";

export type * from "./types";

type EyeDropperConstructor = new () => {
  open: () => Promise<{ sRGBHex: string }>;
};

const DEFAULT_STROKE_STYLE_TOOLS: ReadonlySet<Tool> = new Set([
  "arrow",
  "diamond",
  "draw",
  "ellipse",
  "line",
  "polyline",
  "rectangle"
]);

export function KizkattGraphicEditorController({
  arrowMarkerId = DEFAULT_ARROW_MARKER_ID,
  canvasAriaLabel = DEFAULT_CANVAS_ARIA_LABEL,
  canvasClassName = "kizkatt-canvas",
  children,
  defaultElementStyleByTheme = DEFAULT_ELEMENT_STYLE_BY_THEME,
  getCanvasCursor,
  getToolForSelectedElement,
  naming,
  renderCanvas,
  serializeSvg
}: KizkattGraphicEditorControllerProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const clipboardRef = useRef<KizkattElement[]>([]);
  const copiedPngExportRef = useRef<CopiedPngExport | null>(null);
  const lastStoredElementsRef = useRef<KizkattElement[] | null>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<KizkattTheme>(() => getStoredTheme());
  const [uiScale, setUiScale] = useState(() => getStoredUiScale());
  const [dpi, setDpi] = useState<Dpi>(() => getStoredDpi());
  const [canvasBackgroundColor, setCanvasBackgroundColor] = useState(() =>
    getStoredCanvasBackgroundColor(getStoredTheme())
  );
  const [customCanvasBackgroundColor, setCustomCanvasBackgroundColor] =
    useState(() => getStoredCustomCanvasBackgroundColor(getStoredTheme()));
  const [gridColor, setGridColor] = useState(() =>
    getStoredGridColor(getStoredTheme())
  );
  const [gridSettings, setGridSettings] = useState(() =>
    getStoredGridSettings()
  );
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState<Point>(() => ({ ...INITIAL_PAN }));
  const [defaultStyle, setDefaultStyle] = useState<StyleState>(
    () => defaultElementStyleByTheme[getStoredTheme()]
  );
  const initialCanvasState = useMemo(() => {
    const storedState = getStoredCanvasState();

    return storedState
      ? {
          ...storedState,
          elements: normalizeElementNames(storedState.elements, naming)
        }
      : { elements: [], selectedIds: [] };
  }, [naming]);
  const {
    canvasState,
    canRedo,
    canUndo,
    commitState,
    redo,
    replaceActiveState: replaceHistoryActiveState,
    undo
  } = useCanvasHistory(initialCanvasState);
  const [editingTextElementId, setEditingTextElementId] = useState<
    string | null
  >(null);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  const [pendingImageSize, setPendingImageSize] = useState<Size | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [selectionAreaMode, setSelectionAreaMode] =
    useState<SelectionAreaMode>("intersect");
  const [selectionTransformMode, setSelectionTransformMode] =
    useState<SelectionTransformMode>("resize");
  const [selectionTransformCenter, setSelectionTransformCenter] =
    useState<Point | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [snapToObjects, setSnapToObjects] = useState(false);
  const [arrowBinding, setArrowBinding] = useState(true);
  const [snapToMidpoints, setSnapToMidpoints] = useState(true);
  const [activeDisplayMode, setActiveDisplayMode] =
    useState<EditorDisplayMode | null>(null);
  const [lastDisplayMode, setLastDisplayMode] =
    useState<EditorDisplayMode>("preview");
  const [infoMode, setInfoMode] = useState(false);
  const toggleDisplayMode = useCallback((mode: EditorDisplayMode) => {
    setLastDisplayMode(mode);
    setActiveDisplayMode((currentMode) =>
      currentMode === mode ? null : mode
    );
  }, []);
  const [loadingOperationCount, setLoadingOperationCount] = useState(0);
  const beginLoading = useCallback(() => {
    let finished = false;

    setLoadingOperationCount((count) => count + 1);

    return () => {
      if (finished) {
        return;
      }

      finished = true;
      setLoadingOperationCount((count) => Math.max(0, count - 1));
    };
  }, []);

  const canvasStateRef = useRef(canvasState);
  canvasStateRef.current = canvasState;
  const replaceActiveState = useCallback(
    (nextState: typeof canvasState) => {
      canvasStateRef.current = nextState;
      replaceHistoryActiveState(nextState);
    },
    [replaceHistoryActiveState]
  );
  const mergingStyleChangeRef = useRef(false);
  const mergingGeometryChangeRef = useRef(false);
  const gridSizing = useMemo(
    () => getGridWorldSizing(gridSettings),
    [gridSettings]
  );
  const gridHasVisibleLayer = gridSettings.showMajor || gridSettings.showMinor;
  const gridSnapSize = gridSettings.showMinor
    ? gridSizing.minorSize
    : gridSizing.majorSize;
  const selectedIdSet = useMemo(
    () => new Set(canvasState.selectedIds),
    [canvasState.selectedIds]
  );
  const selectedIdsKey = canvasState.selectedIds.join("\u0000");
  useEffect(() => {
    setSelectionTransformCenter(null);
  }, [selectedIdsKey]);
  const selectedElements = useMemo(
    () =>
      canvasState.elements.filter((element) => selectedIdSet.has(element.id)),
    [canvasState.elements, selectedIdSet]
  );
  const canCopySelection =
    selectedElements.length > EMPTY_COLLECTION_LENGTH;
  const canBreakApart = selectedElements.some(isBreakApartableSvgElement);
  const editingTextElement = canvasState.elements.find(
    (element) => element.id === editingTextElementId && element.type === "text"
  );
  const panelStyle: StyleState = selectedElements[0]
    ? {
        arrowheadScale: selectedElements[0].arrowheadScale ?? 1,
        backgroundColor: selectedElements[0].backgroundColor,
        bitmapTexture: selectedElements[0].bitmapTexture,
        calligraphy: selectedElements[0].calligraphy ?? false,
        calligraphyStretch: selectedElements[0].calligraphyStretch ?? 1,
        edgeStyle: selectedElements[0].edgeStyle ?? DEFAULT_EDGE_STYLE,
        endArrowhead:
          selectedElements[0].endArrowhead ??
          (selectedElements[0].type === "arrow" ? "triangle" : "none"),
        fillStyle: selectedElements[0].fillStyle ?? DEFAULT_FILL_STYLE,
        fillWeight: selectedElements[0].fillWeight ?? DEFAULT_FILL_WEIGHT,
        opacity: selectedElements[0].opacity,
        sloppiness: selectedElements[0].sloppiness ?? DEFAULT_SELECTED_SLOPPINESS,
        sloppinessGap:
          selectedElements[0].sloppinessGap ?? defaultStyle.sloppinessGap,
        scaleStrokeWithObject:
          selectedElements[0].scaleStrokeWithObject ?? false,
        startArrowhead: selectedElements[0].startArrowhead ?? "none",
        strokeBehindFill: selectedElements[0].strokeBehindFill ?? false,
        strokeColor: selectedElements[0].strokeColor,
        strokeLineCount: selectedElements[0].strokeLineCount ??
          (selectedElements[0].sloppiness === "double" ||
          selectedElements[0].sloppiness === "cartoonist"
            ? 2
            : 1),
        strokeStyle: selectedElements[0].strokeStyle,
        strokeWidth:
          selectedElements[0].type === "image" &&
          !selectedElements[0].imageBorderEnabled
            ? 0
            : selectedElements[0].strokeWidth
      }
    : defaultStyle;
  const objectPanelGeometry = useMemo(
    () => getObjectPanelGeometry(selectedElements),
    [selectedElements]
  );
  const canEditDefaultStroke =
    selectedElements.length === EMPTY_COLLECTION_LENGTH &&
    DEFAULT_STROKE_STYLE_TOOLS.has(tool);
  const canGroup = canGroupSelection(
    canvasState.elements,
    canvasState.selectedIds
  );
  const canUngroup = canUngroupSelection(
    canvasState.elements,
    canvasState.selectedIds
  );
  const objectBaseElementIds = useMemo(
    () =>
      new Set(
        expandElementIdsToGroups(canvasState.elements, canvasState.selectedIds)
      ),
    [canvasState.elements, canvasState.selectedIds]
  );
  const objectBaseElements = useMemo(
    () =>
      canvasState.elements.filter((element) =>
        objectBaseElementIds.has(element.id)
      ),
    [canvasState.elements, objectBaseElementIds]
  );
  const canUpdateObjectBase =
    objectBaseElements.length > EMPTY_COLLECTION_LENGTH;
  const canRevertObjectBase = objectBaseElements.some((element) =>
    Boolean(element.base)
  );

  const selectAll = useCallback(() => {
    replaceActiveState(selectAllElements(canvasState));
  }, [canvasState, replaceActiveState]);

  const copySelected = useCallback(() => {
    clipboardRef.current = selectedElements.map((element) => ({ ...element }));
  }, [selectedElements]);

  const pasteSelected = useCallback(() => {
    if (clipboardRef.current.length === EMPTY_COLLECTION_LENGTH) {
      return;
    }

    commitState(
      cloneElementsIntoCanvas(canvasState, clipboardRef.current, naming)
    );
  }, [canvasState, commitState, naming]);

  const duplicateSelected = useCallback(() => {
    if (selectedElements.length === 0) {
      return;
    }

    commitState(cloneElementsIntoCanvas(canvasState, selectedElements, naming));
  }, [canvasState, commitState, naming, selectedElements]);

  const getPastePoint = useCallback((clientPoint?: Point) => {
    const canvasRect = svgRef.current?.getBoundingClientRect();
    const nextClientPoint = clientPoint ??
      (canvasRect
      ? {
          x: canvasRect.left + canvasRect.width / VIEWPORT_CENTER_DIVISOR,
          y: canvasRect.top + canvasRect.height / VIEWPORT_CENTER_DIVISOR
        }
      : {
          x: window.innerWidth / VIEWPORT_CENTER_DIVISOR,
          y: window.innerHeight / VIEWPORT_CENTER_DIVISOR
        });

    return {
      x: (nextClientPoint.x - (canvasRect?.left ?? 0) - pan.x) / zoom,
      y: (nextClientPoint.y - (canvasRect?.top ?? 0) - pan.y) / zoom
    };
  }, [pan, zoom]);

  const insertPastedText = useCallback(
    (text: string, pastePoint = getPastePoint()) => {
      const trimmedText = text.trim();

      if (!trimmedText) {
        return false;
      }

      const lines = trimmedText.split(/\r\n|\r|\n/);
      const longestLineLength = Math.max(
        ...lines.map((line) => line.length),
        1
      );
      const elements = canvasStateRef.current.elements;
      const nextElement: KizkattElement = withUpdatedObjectBase({
        ...createElement("text", pastePoint, defaultStyle),
        height: Math.max(
          TEXT_ELEMENT_DEFAULT_HEIGHT,
          lines.length * PASTED_TEXT_LINE_HEIGHT
        ),
        name: buildElementName("text", elements, naming),
        text: trimmedText,
        width: Math.min(
          PASTED_TEXT_MAX_WIDTH,
          Math.max(
            TEXT_ELEMENT_DEFAULT_WIDTH,
            longestLineLength * PASTED_TEXT_CHARACTER_WIDTH
          )
        )
      });

      commitState({
        elements: [...elements, nextElement],
        selectedBend: undefined,
        selectedIds: [nextElement.id]
      });
      setEditingTextElementId(null);
      setTool("select");

      return true;
    },
    [commitState, defaultStyle, getPastePoint, naming]
  );

  const insertPastedImage = useCallback(
    (
      src: string,
      copiedExport?: CopiedPngExport,
      pastePoint = getPastePoint()
    ) => {
      const endLoading = beginLoading();

      const elements = canvasStateRef.current.elements;
      const baseElement: KizkattElement = {
        ...createElement("image", pastePoint, defaultStyle),
        backgroundColor: TRANSPARENT_COLOR,
        height: DEFAULT_IMAGE_SIZE.height,
        name: buildElementName("image", elements, naming),
        src,
        width: DEFAULT_IMAGE_SIZE.width
      };
      let committed = false;
      const commitImage = (size = DEFAULT_IMAGE_SIZE) => {
        if (committed) {
          return;
        }

        committed = true;
        endLoading();
        const nextElement = withUpdatedObjectBase({ ...baseElement, ...size });

        commitState({
          elements: [...canvasStateRef.current.elements, nextElement],
          selectedBend: undefined,
          selectedIds: [nextElement.id]
        });
        setPendingImageSize(null);
        setPendingImageSrc(null);
        setTool("select");
      };

      const image = new Image();
      image.onload = () => {
        commitImage(
          copiedExport &&
            isExpectedCopiedPngSize(
              image.naturalWidth,
              image.naturalHeight,
              copiedExport,
              copiedExport.dpi
            )
            ? { height: copiedExport.height, width: copiedExport.width }
            : getFittedImageSize(image.naturalWidth, image.naturalHeight)
        );
      };
      image.onerror = () => {
        commitImage();
      };
      image.src = src;

      if (image.complete && image.naturalWidth >= MIN_PIXEL_SIZE) {
        commitImage(
          copiedExport &&
            isExpectedCopiedPngSize(
              image.naturalWidth,
              image.naturalHeight,
              copiedExport,
              copiedExport.dpi
            )
            ? { height: copiedExport.height, width: copiedExport.width }
            : getFittedImageSize(image.naturalWidth, image.naturalHeight)
        );
      }
      window.setTimeout(() => commitImage(), IMAGE_LOAD_FALLBACK_TIMEOUT_MS);
    },
    [beginLoading, commitState, defaultStyle, getPastePoint, naming]
  );

  const readClipboardImage = useCallback(
    (file: Blob, copiedExport?: CopiedPngExport, pastePoint?: Point) => {
      const endLoading = beginLoading();
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === "string") {
          insertPastedImage(reader.result, copiedExport, pastePoint);
        }
        endLoading();
      };
      reader.onerror = endLoading;
      reader.readAsDataURL(file);
    },
    [beginLoading, insertPastedImage]
  );

  const insertPastedSvgCode = useCallback(
    (svgCode: string, pastePoint = getPastePoint()) => {
      const parsedSvg = parseSvgCode(svgCode);

      if (!parsedSvg) {
        return false;
      }

      const elements = canvasStateRef.current.elements;
      const insertionBounds = parsedSvg.canvasBounds;
      const nextElement: KizkattElement = withUpdatedObjectBase({
        ...createElement(
          "image",
          insertionBounds
            ? { x: insertionBounds.x, y: insertionBounds.y }
            : pastePoint,
          defaultStyle
        ),
        backgroundColor: TRANSPARENT_COLOR,
        height: insertionBounds?.height ?? parsedSvg.size.height,
        name: buildElementName("image", elements, naming),
        svgContent: parsedSvg.content,
        svgUseElementStyle: parsedSvg.useElementStyle,
        svgViewBox: parsedSvg.viewBox,
        width: insertionBounds?.width ?? parsedSvg.size.width
      });
      const importedElements = parsedSvg.useElementStyle
        ? []
        : breakApartSvgElement(nextElement, elements, nextElement, naming);

      if (importedElements.length > EMPTY_COLLECTION_LENGTH) {
        commitState({
          elements: [...elements, ...importedElements],
          selectedBend: undefined,
          selectedIds: importedElements.map((element) => element.id)
        });
        setPendingImageSize(null);
        setPendingImageSrc(null);
        setTool("select");

        return true;
      }

      commitState({
        elements: [...elements, nextElement],
        selectedBend: undefined,
        selectedIds: [nextElement.id]
      });
      setPendingImageSize(null);
      setPendingImageSrc(null);
      setTool("select");

      return true;
    },
    [commitState, defaultStyle, getPastePoint, naming]
  );

  const deleteSelected = useCallback(() => {
    if (canvasState.selectedBend) {
      const { bendIndex, elementId } = canvasState.selectedBend;
      const selectedBendElement = canvasState.elements.find(
        (element) => element.id === elementId
      );
      const bends = selectedBendElement
        ? getElementBends(selectedBendElement)
        : [];

      commitState({
        ...canvasState,
        elements:
          selectedBendElement && bends[bendIndex]
            ? canvasState.elements.map((element) =>
                element.id === elementId
                  ? {
                      ...element,
                      bends: bends.filter((_, index) => index !== bendIndex),
                      curve: undefined
                    }
                  : element
              )
            : canvasState.elements,
        selectedBend: undefined,
        selectedIds: selectedBendElement ? [elementId] : canvasState.selectedIds
      });
      return;
    }

    if (canvasState.selectedIds.length === EMPTY_COLLECTION_LENGTH) {
      return;
    }

    commitState({
      elements: canvasState.elements.filter(
        (element) => !selectedIdSet.has(element.id)
      ),
      selectedBend: undefined,
      selectedIds: []
    });
    setEditingTextElementId(null);
  }, [canvasState, commitState, selectedIdSet]);

  const groupSelected = useCallback(() => {
    if (!canGroup) {
      return;
    }

    commitState(groupCanvasSelection(canvasState, naming));
  }, [canGroup, canvasState, commitState, naming]);

  const ungroupSelected = useCallback(() => {
    if (!canUngroup) {
      return;
    }

    commitState(ungroupCanvasSelection(canvasState));
  }, [canUngroup, canvasState, commitState]);

  const breakApartSelected = useCallback(() => {
    if (!canBreakApart) {
      return;
    }

    const nextState = breakApartCanvasSelection(
      canvasState,
      selectedElements,
      naming
    );

    if (!nextState) {
      return;
    }

    commitState(nextState);
    setEditingTextElementId(null);
  }, [canBreakApart, canvasState, commitState, naming, selectedElements]);

  const updateSelectedObjectBase = useCallback(() => {
    if (!canUpdateObjectBase) {
      return;
    }

    commitState(updateObjectBases(canvasState, objectBaseElementIds));
  }, [canUpdateObjectBase, canvasState, commitState, objectBaseElementIds]);

  const revertSelectedObjectBase = useCallback(() => {
    if (!canRevertObjectBase) {
      return;
    }

    setSelectionTransformCenter(null);
    commitState(revertObjectBases(canvasState, objectBaseElementIds));
  }, [canRevertObjectBase, canvasState, commitState, objectBaseElementIds]);

  const copySvgToClipboard = async () => {
    const endLoading = beginLoading();

    try {
      await copySelectionAsSvg({
        elements: selectedElements,
        elementIds: canvasState.selectedIds,
        serializeSvg,
        svg: svgRef.current
      });
    } finally {
      endLoading();
    }
  };

  const copyPngToClipboard = async () => {
    const endLoading = beginLoading();

    try {
      const copiedExport = await copySelectionAsPng({
        dpi,
        elements: selectedElements,
        elementIds: canvasState.selectedIds,
        serializeSvg,
        svg: svgRef.current
      });

      if (copiedExport) {
        copiedPngExportRef.current = copiedExport;
      }
    } finally {
      endLoading();
    }
  };

  const updateSelectedStyle = (
    patch: Partial<StyleState>,
    options: { transient?: boolean } = {}
  ) => {
    const exclusivePatch = getExclusiveFillStylePatch(patch);

    if (canvasState.selectedIds.length === EMPTY_COLLECTION_LENGTH) {
      setDefaultStyle((previousStyle) =>
        applyStylePatch(previousStyle, exclusivePatch)
      );
      mergingStyleChangeRef.current = false;
      return;
    }

    const replaceHistoryEntry =
      Boolean(options.transient) && mergingStyleChangeRef.current;

    commitState({
      ...canvasState,
      elements: canvasState.elements.map((element) => {
        if (!selectedIdSet.has(element.id)) {
          return element;
        }

        if (
          element.type !== "image" ||
          !changesImageBorderStyle(exclusivePatch)
        ) {
          return applyStylePatch(element, exclusivePatch);
        }

        const explicitlyChangesWidth = hasOwnStyleProperty(
          exclusivePatch,
          "strokeWidth"
        );
        const imageBorderEnabled = explicitlyChangesWidth
          ? (exclusivePatch.strokeWidth ?? 0) > 0
          : true;
        const restoredStrokeWidth =
          !explicitlyChangesWidth && element.strokeWidth <= 0
            ? defaultStyle.strokeWidth > 0
              ? defaultStyle.strokeWidth
              : DEFAULT_STROKE_WIDTH
            : element.strokeWidth;

        return applyStylePatch(
          {
            ...element,
            strokeWidth: restoredStrokeWidth,
            imageBorderEnabled
          },
          exclusivePatch
        );
      })
    }, {
      replace: replaceHistoryEntry
    });

    mergingStyleChangeRef.current = Boolean(options.transient);
  };

  const endSelectedStyleChange = () => {
    mergingStyleChangeRef.current = false;
  };

  const updateSelectedGeometry = (
    patch: ObjectGeometryPatch,
    options: { transient?: boolean } = {}
  ) => {
    if (
      !objectPanelGeometry ||
      canvasState.selectedIds.length === EMPTY_COLLECTION_LENGTH
    ) {
      mergingGeometryChangeRef.current = false;
      return;
    }

    const replaceHistoryEntry =
      Boolean(options.transient) && mergingGeometryChangeRef.current;
    const changesOnlyAngle =
      patch.angle !== undefined &&
      patch.heightPercent === undefined &&
      patch.offsetX === undefined &&
      patch.offsetY === undefined &&
      patch.widthPercent === undefined;

    if (changesOnlyAngle) {
      const angleDelta =
        (patch.angle! - objectPanelGeometry.angle) * RADIANS_PER_DEGREE;
      const center = getBoundsCenter(objectPanelGeometry.bounds);

      commitState(
        {
          ...canvasState,
          elements: rotateElementsAroundPoint(
            canvasState.elements,
            canvasState.selectedIds,
            center,
            angleDelta
          )
        },
        { replace: replaceHistoryEntry }
      );
      mergingGeometryChangeRef.current = Boolean(options.transient);
      return;
    }

    const selectedIdSet = new Set(canvasState.selectedIds);
    const selectedBaseElements = canvasState.elements
      .filter((element) => selectedIdSet.has(element.id))
      .map(getElementFromBase);
    const baseBounds = selectionBounds(selectedBaseElements, {
      includeRotation: true
    });

    if (!baseBounds) {
      mergingGeometryChangeRef.current = false;
      return;
    }

    const nextGeometry = {
      ...objectPanelGeometry,
      ...patch
    };
    const baseCenter = getBoundsCenter(baseBounds);
    const nextCenter = {
      x: baseCenter.x + nextGeometry.offsetX,
      y: baseCenter.y + nextGeometry.offsetY
    };
    const nextWidth =
      (baseBounds.width * nextGeometry.widthPercent) /
      DEFAULT_OBJECT_GEOMETRY_PERCENT;
    const nextHeight =
      (baseBounds.height * nextGeometry.heightPercent) /
      DEFAULT_OBJECT_GEOMETRY_PERCENT;
    const scaledBaseElements = resizeElementsFromSelectionHandle(
      selectedBaseElements,
      canvasState.selectedIds,
      baseBounds,
      SELECTION_SCALE_HANDLE,
      {
        x: baseBounds.x + Math.max(MIN_ELEMENT_SIZE, nextWidth),
        y: baseBounds.y + Math.max(MIN_ELEMENT_SIZE, nextHeight)
      }
    );
    const scaledBounds =
      selectionBounds(scaledBaseElements, { includeRotation: true }) ??
      baseBounds;
    const scaledCenter = getBoundsCenter(scaledBounds);
    const translatedElements = scaledBaseElements.map((element) =>
      translateElement(element, {
        x: nextCenter.x - scaledCenter.x,
        y: nextCenter.y - scaledCenter.y
      })
    );
    const transformedElements = rotateElementsAroundPoint(
      translatedElements,
      canvasState.selectedIds,
      nextCenter,
      nextGeometry.angle * RADIANS_PER_DEGREE
    );
    const transformedElementById = new Map(
      transformedElements.map((element) => [element.id, element])
    );
    commitState(
      {
        ...canvasState,
        elements: canvasState.elements.map(
          (element) => transformedElementById.get(element.id) ?? element
        )
      },
      {
        replace: replaceHistoryEntry
      }
    );

    mergingGeometryChangeRef.current = Boolean(options.transient);
  };

  const endSelectedGeometryChange = () => {
    mergingGeometryChangeRef.current = false;
  };

  const mirrorSelected = (axis: ObjectMirrorAxis) => {
    if (
      selectedElements.length === EMPTY_COLLECTION_LENGTH ||
      canvasState.selectedIds.length === EMPTY_COLLECTION_LENGTH
    ) {
      return;
    }

    const bounds = selectionBounds(selectedElements, { includeRotation: true });

    if (!bounds) {
      return;
    }

    const center = getBoundsCenter(bounds);
    const selectedIdSet = new Set(canvasState.selectedIds);

    setSelectionTransformCenter(null);
    commitState({
      ...canvasState,
      elements: canvasState.elements.map((element) =>
        selectedIdSet.has(element.id)
          ? mirrorElementAroundPoint(element, center, axis)
          : element
      )
    });
  };

  const closeablePathElement =
    selectedElements.length === SINGLE_SELECTION_COUNT &&
    (selectedElements[0].type === "line" || selectedElements[0].type === "draw")
      ? selectedElements[0]
      : null;

  const updateClosedPath = (closed: boolean) => {
    if (!closeablePathElement) {
      return;
    }

    commitState({
      ...canvasState,
      elements: canvasState.elements.map((element) =>
        element.id === closeablePathElement.id
          ? { ...element, closed }
          : element
      )
    });
  };

  const applyLayerAction = (
    action: "back" | "backward" | "forward" | "front"
  ) => {
    if (canvasState.selectedIds.length === EMPTY_COLLECTION_LENGTH) {
      return;
    }

    commitState({
      ...canvasState,
      elements: reorderElementsByLayerAction(
        canvasState.elements,
        canvasState.selectedIds,
        action
      )
    });
  };

  const applyElementAction = (
    action: "delete" | "duplicate"
  ) => {
    if (action === "delete") {
      deleteSelected();
      return;
    }

    duplicateSelected();
  };

  const updateTextElement = (elementId: string, text: string) => {
    replaceActiveState({
      ...canvasState,
      elements: canvasState.elements.map((element) =>
        element.id === elementId ? { ...element, text } : element
      )
    });
  };

  const resetCanvas = () => {
    commitState({ elements: [], selectedBend: undefined, selectedIds: [] });
    setEditingTextElementId(null);
    setMenuOpen(false);
  };

  const refreshPage = () => {
    window.location.reload();
  };

  const quickSaveCanvas = () => {
    storeQuickCanvasState(canvasStateRef.current);
    setMenuOpen(false);
  };

  const quickLoadCanvas = () => {
    const storedState = getStoredQuickCanvasState() ?? getStoredCanvasState();

    if (!storedState) {
      setMenuOpen(false);
      return;
    }

    commitState(storedState);
    setEditingTextElementId(null);
    setTool("select");
    setMenuOpen(false);
  };

  const setStoredTheme = (nextTheme: KizkattTheme) => {
    const previousTheme = theme;

    setTheme(nextTheme);
    setCanvasBackgroundColor(getStoredCanvasBackgroundColor(nextTheme));
    setCustomCanvasBackgroundColor(
      getStoredCustomCanvasBackgroundColor(nextTheme)
    );
    setGridColor(getStoredGridColor(nextTheme));
    setDefaultStyle((previousStyle) =>
      isSameStyle(previousStyle, defaultElementStyleByTheme[previousTheme])
        ? defaultElementStyleByTheme[nextTheme]
        : previousStyle
    );
    storeTheme(nextTheme);
  };
  const setStoredUiScale = (scale: number) => {
    setUiScale(scale);
    storeUiScale(scale);
  };
  const setStoredDpi = (nextDpi: Dpi) => {
    setDpi(nextDpi);
    storeDpi(nextDpi);
  };

  const setStoredCanvasBackground = (color: string) => {
    setCanvasBackgroundColor(color);
    storeCanvasBackgroundColor(color, theme);
  };

  const pickCanvasBackground = async () => {
    const EyeDropper = (window as Window & { EyeDropper?: EyeDropperConstructor })
      .EyeDropper;

    if (!EyeDropper) {
      return;
    }

    const result = await new EyeDropper().open();
    setCustomCanvasBackgroundColor(result.sRGBHex);
    storeCustomCanvasBackgroundColor(result.sRGBHex, theme);
    setStoredCanvasBackground(result.sRGBHex);
  };

  const setStoredGridColor = (color: string) => {
    setGridColor(color);
    storeGridColor(color, theme);
  };

  const setStoredGridSettings = (settings: GridSettings) => {
    const normalizedSettings = normalizeGridSettings(settings);
    const gridLayerVisibilityChanged =
      gridSettings.showMajor !== normalizedSettings.showMajor ||
      gridSettings.showMinor !== normalizedSettings.showMinor;
    const nextGridHasVisibleLayer =
      normalizedSettings.showMajor || normalizedSettings.showMinor;

    setGridSettings(normalizedSettings);
    storeGridSettings(normalizedSettings);

    if (!nextGridHasVisibleLayer) {
      setShowGrid(false);
    } else if (gridLayerVisibilityChanged) {
      setShowGrid(true);
    }
  };

  const activateTool = (nextTool: Tool) => {
    if (nextTool === "image") {
      imageInputRef.current?.click();
      return;
    }

    setSelectionTransformMode("resize");
    setSelectionTransformCenter(null);
    setTool(nextTool);
  };

  const readImageFile = (file: File) => {
    const endLoading = beginLoading();
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        const src = reader.result;
        const image = new Image();
        let activated = false;
        const activateImageTool = (size: Size) => {
          if (activated) {
            return;
          }

          activated = true;
          endLoading();
          setPendingImageSize(size);
          setPendingImageSrc(src);
          setTool("image");
        };

        image.onload = () => {
          activateImageTool(
            image.naturalWidth >= MIN_PIXEL_SIZE &&
              image.naturalHeight >= MIN_PIXEL_SIZE
              ? getImageSize(image.naturalWidth, image.naturalHeight)
              : DEFAULT_IMAGE_SIZE
          );
        };
        image.onerror = () => activateImageTool(DEFAULT_IMAGE_SIZE);
        image.src = src;

        if (image.complete && image.naturalWidth >= MIN_PIXEL_SIZE) {
          activateImageTool(
            getImageSize(image.naturalWidth, image.naturalHeight)
          );
        }
        if (!activated) {
          window.setTimeout(
            () => activateImageTool(DEFAULT_IMAGE_SIZE),
            IMAGE_LOAD_FALLBACK_TIMEOUT_MS
          );
        }
      } else {
        endLoading();
      }
    };
    reader.onerror = endLoading;
    reader.readAsDataURL(file);
  };

  const onImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = EMPTY_INPUT_VALUE;

    if (!file) {
      return;
    }

    readImageFile(file);
  };

  const onBoardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (isEditableKeyboardTarget(event.target)) {
      return;
    }

    if (isAllowedEditingShortcut(event)) {
      const key = event.key.toLowerCase();

      if (
        key === EDITING_SHORTCUT_KEY.paste &&
        clipboardRef.current.length === EMPTY_COLLECTION_LENGTH
      ) {
        return;
      }

      event.preventDefault();

      if (key === EDITING_SHORTCUT_KEY.selectAll) {
        selectAll();
      } else if (key === EDITING_SHORTCUT_KEY.copy) {
        copySelected();
      } else if (key === EDITING_SHORTCUT_KEY.paste) {
        pasteSelected();
      } else if (key === EDITING_SHORTCUT_KEY.undo && event.shiftKey) {
        redo();
      } else if (key === EDITING_SHORTCUT_KEY.undo) {
        undo();
      } else if (key === EDITING_SHORTCUT_KEY.redo) {
        redo();
      }

      return;
    }

    if (event.key === EDITOR_KEY.delete) {
      event.preventDefault();
      deleteSelected();
      return;
    }

    stopDrawingEngineShortcuts(event);
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const runContextMenuAction = (action: () => void | Promise<void>) => {
    closeContextMenu();
    void action();
    svgRef.current
      ?.closest<HTMLElement>(".kizkatt-board")
      ?.focus({ preventScroll: true });
  };

  const onCanvasContextMenu = (event: ReactMouseEvent<SVGSVGElement>) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY
    });
  };

  const getCopiedPngExport = (file: Blob): CopiedPngExport | undefined => {
    const copiedPngExport = copiedPngExportRef.current;

    if (
      file.type !== PNG_IMAGE_MIME_TYPE ||
      !copiedPngExport ||
      Date.now() - copiedPngExport.createdAt > COPIED_PNG_EXPORT_SIZE_TTL_MS
    ) {
      return undefined;
    }

    return copiedPngExport;
  };

  const pasteFromContextMenu = async () => {
    const pastePoint = getPastePoint(
      contextMenu
        ? {
            x: contextMenu.x,
            y: contextMenu.y
          }
        : undefined
    );

    const endLoading = beginLoading();

    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();

        for (const item of items) {
          const imageType = item.types.find((type) =>
            type.startsWith(IMAGE_MIME_TYPE_PREFIX)
          );

          if (imageType) {
            const imageBlob = await item.getType(imageType);
            readClipboardImage(
              imageBlob,
              getCopiedPngExport(imageBlob),
              pastePoint
            );
            return;
          }
        }

        for (const item of items) {
          if (item.types.includes(PLAIN_TEXT_MIME_TYPE)) {
            const textBlob = await item.getType(PLAIN_TEXT_MIME_TYPE);
            const text = await textBlob.text();

            if (insertPastedText(text, pastePoint)) {
              return;
            }
          }
        }
      }

      const text = await navigator.clipboard?.readText?.();

      if (text && insertPastedText(text, pastePoint)) {
        return;
      }
    } catch {
      
    } finally {
      endLoading();
    }

    pasteSelected();
  };

  const pasteSvgCodeFromContextMenu = async () => {
    const pastePoint = getPastePoint(
      contextMenu
        ? {
            x: contextMenu.x,
            y: contextMenu.y
          }
        : undefined
    );

    const endLoading = beginLoading();

    try {
      const text = await navigator.clipboard?.readText?.();

      if (text) {
        insertPastedSvgCode(text, pastePoint);
      }
    } catch {
      
    } finally {
      endLoading();
    }
  };

  const onBoardPaste = (event: ClipboardEvent<HTMLElement>) => {
    if (isEditableKeyboardTarget(event.target)) {
      return;
    }

    const clipboardData = event.clipboardData;
    const imageItem = Array.from(clipboardData.items).find((item) =>
      item.type.startsWith(IMAGE_MIME_TYPE_PREFIX)
    );
    const imageFile =
      imageItem?.getAsFile() ??
      Array.from(clipboardData.files).find((file) =>
        file.type.startsWith(IMAGE_MIME_TYPE_PREFIX)
      );

    if (imageFile) {
      event.preventDefault();
      readClipboardImage(imageFile, getCopiedPngExport(imageFile));
      return;
    }

    if (insertPastedText(clipboardData.getData(PLAIN_TEXT_MIME_TYPE))) {
      event.preventDefault();
    }
  };

  const onBoardPointerDownCapture = (
    event: ReactPointerEvent<HTMLElement>
  ) => {
    if (!menuOpen || !(event.target instanceof Element)) {
      return;
    }

    if (
      event.target.closest(".kizkatt-main-menu") ||
      event.target.closest(".kizkatt-menu-button")
    ) {
      return;
    }

    setMenuOpen(false);
  };

  const {
    imagePreviewPoint,
    interaction,
    onDoubleClick,
    onPointerDown,
    onPointerLeave,
    onPointerMove,
    onPointerUp
  } =
    useToolPointerHandlers({
      canvasState,
      canvasStateRef,
      closeContextMenu,
      commitState,
      createElementName: (type, elements) =>
        buildElementName(type, elements, naming),
      getToolForSelectedElement,
      pan,
      pendingImageSize,
      pendingImageSrc,
      replaceActiveState,
      selectionAreaMode,
      selectionTransformCenter,
      selectionTransformMode,
      selectedElements,
      setEditingTextElementId,
      setPan,
      setPendingImageSize,
      setPendingImageSrc,
      setSelectionTransformCenter,
      setSelectionTransformMode,
      setTool,
      gridCellSize: gridSnapSize,
      snapToGrid: snapToGrid && gridHasVisibleLayer,
      snapToMidpoints,
      snapToObjects,
      style: defaultStyle,
      svgRef,
      tool,
      zoom
    });

  useEffect(() => {
    if (
      !interaction &&
      lastStoredElementsRef.current !== canvasState.elements
    ) {
      storeCanvasState(canvasState);
      lastStoredElementsRef.current = canvasState.elements;
    }
  }, [canvasState, interaction]);

  const canvasCursor =
    getActiveInteractionCursor(interaction) ??
    getCanvasCursor({
      isPanning: interaction?.type === "pan",
      tool
    });
  const previewTransformInteraction = isPreviewTransformInteraction(interaction)
    ? interaction
    : null;
  const cullingSourceElements = previewTransformInteraction
    ? previewTransformInteraction.originalElements
    : interaction?.type === "pan"
    ? canvasState.elements
    : null;
  const visibleElementIndices = useMemo(() => {
    if (!cullingSourceElements) {
      return null;
    }

    const canvasRect = svgRef.current?.getBoundingClientRect();
    const viewportWidth = canvasRect?.width || window.innerWidth;
    const viewportHeight = canvasRect?.height || window.innerHeight;
    const overscan = RENDER_OVERSCAN_PX / zoom;

    return getElementIndicesInBounds(
      cullingSourceElements,
      {
        height: viewportHeight / zoom + overscan * 2,
        width: viewportWidth / zoom + overscan * 2,
        x: -pan.x / zoom - overscan,
        y: -pan.y / zoom - overscan
      },
      selectedIdSet
    );
  }, [cullingSourceElements, pan.x, pan.y, selectedIdSet, zoom]);
  const elementsInViewport = visibleElementIndices
    ? visibleElementIndices.flatMap((elementIndex) => {
        const element = canvasState.elements[elementIndex];

        return element ? [element] : [];
      })
    : canvasState.elements;
  const layerNumberById = useMemo(
    () =>
      new Map(
        canvasState.elements.map((element, index) => [element.id, index + 1])
      ),
    [canvasState.elements]
  );
  const infoOverlayItems = useMemo(() => {
    if (!infoMode) {
      return [];
    }

    const visibleElementIds = new Set(
      elementsInViewport.map((element) => element.id)
    );
    const visibleGroupIds = new Set(
      elementsInViewport.flatMap((element) =>
        element.groupId ? [element.groupId] : []
      )
    );

    return canvasState.elements.flatMap((element) =>
      visibleElementIds.has(element.id) ||
      (element.groupId && visibleGroupIds.has(element.groupId))
        ? [
            {
              element,
              layerNumber: layerNumberById.get(element.id) ?? 1
            }
          ]
        : []
    );
  }, [
    canvasState.elements,
    elementsInViewport,
    infoMode,
    layerNumberById
  ]);
  const displayElements = getPreviewDisplayElements(
    elementsInViewport,
    previewTransformInteraction
  );
  const imagePlacementBounds =
    tool === "image" && pendingImageSrc
      ? getImagePlacementBounds(
          interaction,
          imagePreviewPoint,
          pendingImageSize ?? DEFAULT_IMAGE_SIZE
        )
      : null;
  const getElementSelectionRenderState = (element: KizkattElement) => {
    const isSelected = selectedIdSet.has(element.id);
    const showPrimaryOverlay =
      !previewTransformInteraction &&
      selectedElements.length <= SINGLE_SELECTION_COUNT &&
      isSelected;
    const showInternalOverlay =
      !previewTransformInteraction &&
      selectedElements.length > SINGLE_SELECTION_COUNT &&
      isSelected;
    const isDrawingFreehand =
      interaction?.type === "create" &&
      interaction.elementId === element.id &&
      element.type === "draw";
    const isDrawingPolygon =
      interaction?.type === "polylineCreate" &&
      interaction.elementId === element.id;
    const isCreatingLinearElement =
      ((interaction?.type === "create" &&
        interaction.elementId === element.id) ||
        isDrawingPolygon) &&
      (element.type === "line" || element.type === "arrow");
    const isCreatingElement =
      (interaction?.type === "create" && interaction.elementId === element.id) ||
      isDrawingPolygon;
    const isRotatingSelection = interaction?.type === "rotate";

    const options: KizkattRenderElementOptions = {
      linearEndpointMode: tool === "nodeEdit" ? "node" : "resize",
      selectedBendIndex:
        canvasState.selectedBend?.elementId === element.id
          ? canvasState.selectedBend.bendIndex
          : undefined,
      selectionTransformCenter,
      selectionTransformMode,
      showLinearBendHandles:
        tool === "nodeEdit" && !isCreatingLinearElement,
      showRotateHoverIcon: !isRotatingSelection,
      showRotateHandle: DEFAULT_SHOW_ROTATE_HANDLE && !isCreatingElement,
      showSelectionBounds: !isRotatingSelection,
      wireframe: activeDisplayMode === "wireframe"
    };

    return {
      options,
      showInternalOverlay,
      showPrimaryOverlay:
        showPrimaryOverlay && !isDrawingFreehand && !isDrawingPolygon
    };
  };

  const canvas = renderCanvas({
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
    onContextMenu: onCanvasContextMenu,
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
    showGrid: showGrid && gridHasVisibleLayer,
    showRotateHandle: DEFAULT_SHOW_ROTATE_HANDLE,
    svgRef,
    zoom
  });

  return children({
    boardBindings: {
      onKeyDownCapture: onBoardKeyDown,
      onPaste: onBoardPaste,
      onPointerDownCapture: onBoardPointerDownCapture
    },
    canvas,
    commandControls: {
      arrowBinding,
      canBreakApart,
      canCopySelection,
      canGroup,
      canRevertObjectBase,
      canUngroup,
      canUpdateObjectBase,
      contextMenu,
      onCloseAndRun: runContextMenuAction,
      onBreakApart: breakApartSelected,
      onCopy: copySelected,
      onCopyPng: copyPngToClipboard,
      onCopySvg: copySvgToClipboard,
      onGroup: groupSelected,
      onPaste: pasteFromContextMenu,
      onPasteSvgCode: pasteSvgCodeFromContextMenu,
      onRefreshPage: refreshPage,
      onRevertObjectBase: revertSelectedObjectBase,
      onSelectAll: selectAll,
      onUpdateObjectBase: updateSelectedObjectBase,
      onUngroup: ungroupSelected,
      selectionAreaMode,
      setArrowBinding,
      setSelectionAreaMode,
      setSnapToMidpoints,
      setSnapToObjects,
      snapToMidpoints,
      snapToObjects
    },
    documentControls: {
      activeDisplayMode,
      canvasBackgroundColor,
      customCanvasBackgroundColor,
      lastDisplayMode,
      menuOpen,
      onCanvasBackgroundChange: setStoredCanvasBackground,
      onExport: quickSaveCanvas,
      onMenuOpenChange: setMenuOpen,
      onOpen: quickLoadCanvas,
      onPickCanvasBackground: () => void pickCanvasBackground(),
      onResetCanvas: resetCanvas,
      onThemeChange: setStoredTheme,
      onToggleLastDisplayMode: () => toggleDisplayMode(lastDisplayMode),
      theme
    },
    imageInputBindings: {
      accept: IMAGE_FILE_ACCEPT,
      onChange: onImageFileChange,
      ref: imageInputRef
    },
    selectionGeometryControls: objectPanelGeometry || canEditDefaultStroke
      ? {
          geometry: objectPanelGeometry,
          gridSettings,
          onAction: applyElementAction,
          onGeometryChange: updateSelectedGeometry,
          onGeometryChangeEnd: endSelectedGeometryChange,
          onLayerAction: applyLayerAction,
          onMirror: mirrorSelected,
          onPaste: () =>
            getStoredContextMenuDefaults().paste === "svgCode"
              ? pasteSvgCodeFromContextMenu()
              : pasteFromContextMenu(),
          onStyleChange: updateSelectedStyle,
          onStyleChangeEnd: endSelectedStyleChange,
          selectedElements,
          style: panelStyle,
          theme
        }
      : null,
    state: {
      isLoading: loadingOperationCount > 0,
      menuOpen,
      theme,
      uiScale,
      activeDisplayMode
    },
    stylingControls: {
      activeTool: tool,
      canToggleClosedPath: Boolean(closeablePathElement),
      closedPath: Boolean(closeablePathElement?.closed),
      onClosedPathChange: updateClosedPath,
      onStyleChange: updateSelectedStyle,
      onStyleChangeEnd: endSelectedStyleChange,
      selectedElements,
      style: panelStyle,
      theme
    },
    textEditing: editingTextElement
      ? {
          element: editingTextElement,
          onBlur: () => setEditingTextElementId(null),
          onChange: (text) => updateTextElement(editingTextElement.id, text),
          pan,
          zoom
        }
      : null,
    toolControls: {
      activeTool: tool,
      onActivateTool: activateTool
    },
    workspaceControls: {
      activeDisplayMode,
      canRedo,
      canUndo,
      canUseGrid: gridHasVisibleLayer,
      dpi,
      gridColor,
      gridSettings,
      infoMode,
      onGridColorChange: setStoredGridColor,
      onGridSettingsChange: setStoredGridSettings,
      onDpiChange: setStoredDpi,
      onRedo: redo,
      onToggleGrid: () => setShowGrid((value) => !value),
      onToggleSnapToGrid: () => setSnapToGrid((value) => !value),
      onToggleDisplayMode: toggleDisplayMode,
      onToggleInfoMode: () => setInfoMode((value) => !value),
      onUiScaleChange: setStoredUiScale,
      onUndo: undo,
      onZoomIn: () =>
        setZoom((value) => Math.min(MAX_ZOOM, value + ZOOM_STEP)),
      onZoomOut: () =>
        setZoom((value) => Math.max(MIN_ZOOM, value - ZOOM_STEP)),
      showGrid: showGrid && gridHasVisibleLayer,
      snapToGrid: snapToGrid && gridHasVisibleLayer,
      theme,
      uiScale,
      zoom
    }
  });
}
