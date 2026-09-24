import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent
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
  ZOOM_CLICK_STEP,
  ZOOM_STEP
} from "kizkatt-graphic-engine";
import {
  createElement,
  createSimpleTraceElement,
  createDefaultKizkattSceneSettings,
  createId,
  createSceneExport,
  DEFAULT_SCENE_FILE_NAME,
  getKizkattDocumentCanvasState,
  importSceneElements,
  importSvgElements,
  isBitmapImageElement,
  parseKizkattSceneDocument,
  type SceneFileFormat,
  type SimpleTraceResult,
  withUpdatedObjectBase
} from "kizkatt-graphic-engine";
import {
  createElementName as buildElementName,
  normalizeElementNames
} from "kizkatt-graphic-engine";
import {
  canBreakApartLineCombinationSelection,
  canGroupSelection,
  canUngroupSelection,
  expandElementIdsToGroups
} from "kizkatt-graphic-engine";
import {
  getElementBends,
  getElementLocalPoint,
  getDefaultLinearSegmentControl,
  getLinearElementPoints,
  getLinearElementSegmentControls,
  getLinearElementSegmentMidpoint,
  moveLinearElementEndpoint,
  transformElementPoint,
  getElementIndicesInBounds,
  getCalibratedMillimetersWorldSize,
  getGridWorldSizing,
  getElementsViewportBounds,
  getLogicalPageBounds,
  reorderElementsByLayerAction,
  resizeElementsFromSelectionHandle,
  rotateElementsAroundPoint,
  selectionBounds,
  fitBoundsInViewport,
  panViewportByWheel,
  zoomViewportAtPoint
} from "kizkatt-graphic-engine";
import {
  getStoredCanvasBackgroundColor,
  getStoredCustomCanvasBackgroundColor,
  getStoredContextMenuDefaults,
  getStoredDpi,
  getStoredGridColor,
  getStoredGridSettings,
  getStoredTheme,
  getStoredUiScale,
  normalizeGridSettings,
  storeCanvasBackgroundColor,
  storeCustomCanvasBackgroundColor,
  storeDpi,
  storeGridColor,
  storeGridSettings,
  storeTheme,
  storeUiScale
} from "kizkatt-ui";
import {
  EDITING_SHORTCUT_KEY,
  EDITOR_KEY,
  isAllowedEditingShortcut,
  isEditableKeyboardTarget,
  stopDrawingEngineShortcuts
} from "../platform/editorKeyboard";
import {
  getStoredCanvasState,
  storeCanvasState
} from "../platform/canvasStorage";
import { copySelectionAsPng, copySelectionAsSvg } from "../export/clipboardExport";
import {
  loadSceneFile,
  saveSceneFile,
  type SceneFileHandle
} from "../platform/sceneFiles";
import { useCanvasAutosave } from "../state/useCanvasAutosave";
import { useCanvasHistory } from "../state/useCanvasHistory";
import { useToolPointerHandlers } from "../tools/pointer";
import type {
  ContextMenuState,
  Bounds,
  CanvasState,
  Dpi,
  GridSettings,
  KizkattElement,
  LinearSegmentControl,
  SelectionTransformMode,
  Point,
  SelectionAreaMode,
  StyleState,
  KizkattTheme,
  KizkattSceneDocument,
  KizkattSceneSettings,
  Tool,
  ViewportZoomAction
} from "kizkatt-graphic-engine";
import {
  getInteractionCursor,
  type NodeEditorAction
} from "kizkatt-ui";
import {
  COPIED_PNG_EXPORT_SIZE_TTL_MS,
  getFittedImageSize,
  getImageSize,
  isExpectedCopiedPngSize,
  type CopiedPngExport,
  type Size
} from "kizkatt-graphic-engine";
import {
  getImagePlacementBounds,
  getPreviewDisplayElements,
  isPreviewTransformInteraction
} from "kizkatt-graphic-engine";
import { isBreakApartableSvgElement } from "kizkatt-graphic-engine";
import type {
  ContextualFillStyle,
  DocumentFormatDialogAction,
  DocumentFormatSelection,
  KizkattRenderElementOptions,
  EditorDisplayMode,
  SceneReplacementAction
} from "kizkatt-ui";
import type { KizkattGraphicEditorControllerProps } from "./types";
import {
  applyStylePatch,
  breakApartCanvasSelection,
  breakApartLineCombinationCanvasSelection,
  changesImageBorderStyle,
  cloneElementsIntoCanvas,
  DEFAULT_OBJECT_GEOMETRY_PERCENT,
  getBoundsCenter,
  getElementFromBase,
  getExclusiveFillStylePatch,
  getObjectDimensionPatch,
  getObjectPanelGeometry,
  groupCanvasSelection,
  hasOwnStyleProperty,
  isSameStyle,
  mirrorElementAroundPoint,
  MIN_OBJECT_GEOMETRY_PERCENT,
  RADIANS_PER_DEGREE,
  revertObjectBases,
  selectAllElements,
  SELECTION_SCALE_HANDLE,
  translateElement,
  ungroupCanvasSelection,
  updateObjectBases
} from "kizkatt-graphic-engine";
import type {
  ObjectDimensionAxis,
  ObjectGeometryPatch,
  ObjectMirrorAxis
} from "kizkatt-graphic-engine";

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

function getSplitLinearSegmentControls(
  sourceElement: KizkattElement,
  targetElement: KizkattElement,
  controls: ReturnType<typeof getLinearElementSegmentControls>
): LinearSegmentControl[] {
  return controls.map((control) => {
    if (control.mode !== "curve" || !control.cp1 || !control.cp2) {
      return { mode: "line" };
    }

    const cp1 = transformElementPoint(sourceElement, control.cp1);
    const cp2 = transformElementPoint(sourceElement, control.cp2);

    return {
      cp1: {
        x: cp1.x - targetElement.x,
        y: cp1.y - targetElement.y
      },
      cp2: {
        x: cp2.x - targetElement.x,
        y: cp2.y - targetElement.y
      },
      mode: "curve"
    };
  });
}

function createSplitLinearElement(
  sourceElement: KizkattElement,
  id: string,
  name: string | undefined,
  points: Point[],
  controls: ReturnType<typeof getLinearElementSegmentControls>,
  splitPart: "first" | "second"
) {
  const worldPoints = points.map((point) =>
    transformElementPoint(sourceElement, point)
  );
  const start = worldPoints[0];
  const end = worldPoints[worldPoints.length - 1];
  const element: KizkattElement = {
    ...sourceElement,
    angle: 0,
    backgroundColor: TRANSPARENT_COLOR,
    bitmapTexture: undefined,
    bends: worldPoints.slice(1, -1).map((point) => ({
      x: point.x - start.x,
      y: point.y - start.y
    })),
    closed: false,
    curve: undefined,
    endArrowhead:
      sourceElement.type === "arrow" && splitPart === "first"
        ? "none"
        : sourceElement.endArrowhead,
    flipX: false,
    flipY: false,
    gradientFill: undefined,
    height: end.y - start.y,
    id,
    name,
    skewX: 0,
    skewY: 0,
    startArrowhead:
      sourceElement.type === "arrow" && splitPart === "second"
        ? "none"
        : sourceElement.startArrowhead,
    width: end.x - start.x,
    x: start.x,
    y: start.y
  };

  return withUpdatedObjectBase({
    ...element,
    linearSegmentControls: getSplitLinearSegmentControls(
      sourceElement,
      element,
      controls
    )
  });
}

function getSelectedLinearNodeSelections(
  selectedNodes: NonNullable<CanvasState["selectedNodes"]>
) {
  return selectedNodes.lineSelections?.length
    ? selectedNodes.lineSelections
    : [
        {
          elementId: selectedNodes.elementId,
          nodeIndices: selectedNodes.nodeIndices,
          segmentIndex: selectedNodes.segmentIndex
        }
      ];
}

function getSelectedNodeSelectionForElement(
  selectedNodes: CanvasState["selectedNodes"],
  elementId: string
) {
  return selectedNodes
    ? getSelectedLinearNodeSelections(selectedNodes).find(
        (selection) => selection.elementId === elementId
      )
    : undefined;
}

function isEndpointNodeIndex(nodeIndex: number, bends: Point[]) {
  return nodeIndex === 0 || nodeIndex === bends.length + 1;
}

function isStartEndNodeSelection(nodeIndices: number[], bends: Point[]) {
  const selectedNodeIndices = new Set(nodeIndices);
  const endNodeIndex = bends.length + 1;

  return (
    bends.length > 0 &&
    selectedNodeIndices.size === 2 &&
    selectedNodeIndices.has(0) &&
    selectedNodeIndices.has(endNodeIndex)
  );
}

function getLinearNodeWorldPoint(
  element: KizkattElement,
  bends: Point[],
  nodeIndex: number
) {
  const point = getLinearElementPoints(element, bends)[nodeIndex];

  return point ? transformElementPoint(element, point) : null;
}

function moveLinearNodeToWorldPoint(
  element: KizkattElement,
  bends: Point[],
  nodeIndex: number,
  point: Point
) {
  if (nodeIndex === 0) {
    return moveLinearElementEndpoint(element, "start", point, "node");
  }

  if (nodeIndex === bends.length + 1) {
    return moveLinearElementEndpoint(element, "end", point, "node");
  }

  const bendIndex = nodeIndex - 1;
  const localPoint = getElementLocalPoint(element, point);

  return {
    ...element,
    bends: bends.map((bend, index) =>
      index === bendIndex
        ? {
            x: localPoint.x - element.x,
            y: localPoint.y - element.y
          }
        : bend
    ),
    curve: undefined
  };
}

function closeLinearElementAtStart(element: KizkattElement, bends: Point[]) {
  const linePoints = getLinearElementPoints(element, bends);
  const keptPoints = linePoints.slice(0, -1);
  const start = keptPoints[0];
  const end = keptPoints[keptPoints.length - 1];

  if (!start || !end || keptPoints.length < 2) {
    return element;
  }

  return withUpdatedObjectBase({
    ...element,
    bends: keptPoints.slice(1, -1).map((point) => ({
      x: point.x - start.x,
      y: point.y - start.y
    })),
    closed: true,
    curve: undefined,
    height: end.y - start.y,
    linearSegmentControls: undefined,
    width: end.x - start.x,
    x: start.x,
    y: start.y
  });
}

type SelectedLinearNodeEntry = {
  bends: Point[];
  element: KizkattElement;
  nodeIndex: number;
  nodeIndices: number[];
  segmentIndex?: number;
};

type OrientedLinearPart = {
  controls: ReturnType<typeof getLinearElementSegmentControls>;
  endArrowhead: KizkattElement["endArrowhead"];
  points: Point[];
  startArrowhead: KizkattElement["startArrowhead"];
};

function getWorldLinearSegmentControls(
  element: KizkattElement,
  points: Point[]
) {
  return getLinearElementSegmentControls(element, points).map((control) =>
    control.mode === "curve" && control.cp1 && control.cp2
      ? {
          cp1: transformElementPoint(element, control.cp1),
          cp2: transformElementPoint(element, control.cp2),
          mode: "curve" as const
        }
      : { mode: "line" as const }
  );
}

function reverseLinearSegmentControls(
  controls: ReturnType<typeof getLinearElementSegmentControls>
) {
  return [...controls].reverse().map((control) =>
    control.mode === "curve" && control.cp1 && control.cp2
      ? {
          cp1: control.cp2,
          cp2: control.cp1,
          mode: "curve" as const
        }
      : { mode: "line" as const }
  );
}

function getOrientedLinearPart(
  entry: SelectedLinearNodeEntry,
  targetPoint: Point,
  joinPosition: "start" | "end"
): OrientedLinearPart {
  const localPoints = getLinearElementPoints(entry.element, entry.bends);
  const selectedEndpoint = entry.nodeIndex === 0 ? "start" : "end";
  const shouldReverse = selectedEndpoint !== joinPosition;
  const points = localPoints.map((point) =>
    transformElementPoint(entry.element, point)
  );
  const controls = getWorldLinearSegmentControls(entry.element, localPoints);
  const orientedPoints = shouldReverse ? [...points].reverse() : points;
  const orientedControls = shouldReverse
    ? reverseLinearSegmentControls(controls)
    : controls;
  const nextPoints =
    joinPosition === "start"
      ? [targetPoint, ...orientedPoints.slice(1)]
      : [
          ...orientedPoints.slice(0, -1),
          targetPoint
        ];
  const startArrowhead = shouldReverse
    ? entry.element.endArrowhead
    : entry.element.startArrowhead;
  const endArrowhead = shouldReverse
    ? entry.element.startArrowhead
    : entry.element.endArrowhead;

  return {
    controls: orientedControls,
    endArrowhead,
    points: nextPoints,
    startArrowhead
  };
}

function createMergedLinearElement(
  firstEntry: SelectedLinearNodeEntry,
  secondEntry: SelectedLinearNodeEntry,
  targetPoint: Point
) {
  const firstPart = getOrientedLinearPart(firstEntry, targetPoint, "end");
  const secondPart = getOrientedLinearPart(secondEntry, targetPoint, "start");
  const worldPoints = [
    ...firstPart.points,
    ...secondPart.points.slice(1)
  ];
  const start = worldPoints[0];
  const end = worldPoints[worldPoints.length - 1];
  const mergedElement: KizkattElement = {
    ...firstEntry.element,
    angle: 0,
    bends: worldPoints.slice(1, -1).map((point) => ({
      x: point.x - start.x,
      y: point.y - start.y
    })),
    closed: false,
    curve: undefined,
    endArrowhead: secondPart.endArrowhead,
    flipX: false,
    flipY: false,
    height: end.y - start.y,
    lineCombinationId: undefined,
    linearSegmentControls: [
      ...firstPart.controls,
      ...secondPart.controls
    ].map((control) =>
      control.mode === "curve" && control.cp1 && control.cp2
        ? {
            cp1: {
              x: control.cp1.x - start.x,
              y: control.cp1.y - start.y
            },
            cp2: {
              x: control.cp2.x - start.x,
              y: control.cp2.y - start.y
            },
            mode: "curve" as const
          }
        : { mode: "line" as const }
    ),
    skewX: 0,
    skewY: 0,
    startArrowhead: firstPart.startArrowhead,
    width: end.x - start.x,
    x: start.x,
    y: start.y
  };

  return {
    element: withUpdatedObjectBase(mergedElement),
    joinedNodeIndex: firstPart.points.length - 1
  };
}

export function KizkattGraphicEditorController({
  arrowMarkerId = DEFAULT_ARROW_MARKER_ID,
  canvasAriaLabel = DEFAULT_CANVAS_ARIA_LABEL,
  canvasClassName = "kizkatt-canvas",
  children,
  defaultElementStyleByTheme = DEFAULT_ELEMENT_STYLE_BY_THEME,
  getCanvasCursor,
  getToolForSelectedElement,
  naming,
  renderCanvas
}: KizkattGraphicEditorControllerProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const clipboardRef = useRef<KizkattElement[]>([]);
  const copiedPngExportRef = useRef<CopiedPngExport | null>(null);
  const currentDocumentMetaRef = useRef<
    KizkattSceneDocument["kk"]["meta"] | null
  >(null);
  const currentDocumentHandleRef = useRef<SceneFileHandle | null>(null);
  const currentDocumentFormatRef = useRef<SceneFileFormat | null>(null);
  const currentDocumentArchiveRef = useRef(true);
  const currentDocumentNameRef = useRef(DEFAULT_SCENE_FILE_NAME);
  const fillSettingsRequestIdRef = useRef(0);
  const [tool, setTool] = useState<Tool>("select");
  const [fillSettingsRequest, setFillSettingsRequest] = useState<{
    fillStyle: ContextualFillStyle;
    id: number;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [formatDialogAction, setFormatDialogAction] =
    useState<DocumentFormatDialogAction | null>(null);
  const [sceneReplacementAction, setSceneReplacementAction] =
    useState<SceneReplacementAction | null>(null);
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
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;
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
  const simpleTraceSource =
    selectedElements.length === SINGLE_SELECTION_COUNT &&
    isBitmapImageElement(selectedElements[0])
      ? selectedElements[0]
      : null;
  const applySimpleTrace = useCallback(
    (result: SimpleTraceResult, deleteOriginal: boolean) => {
      if (!simpleTraceSource) {
        return;
      }

      const tracedElement = createSimpleTraceElement({
        id: createId(),
        name: buildElementName("image", canvasState.elements, naming),
        result,
        source: simpleTraceSource
      });
      const sourceIndex = canvasState.elements.findIndex(
        (element) => element.id === simpleTraceSource.id
      );

      if (sourceIndex < 0) {
        return;
      }

      const elements = [...canvasState.elements];
      elements.splice(
        deleteOriginal ? sourceIndex : sourceIndex + 1,
        deleteOriginal ? 1 : 0,
        tracedElement
      );
      commitState({
        ...canvasState,
        elements,
        selectedBend: undefined,
        selectedIds: [tracedElement.id],
        selectedNodes: undefined
      });
      setSelectionTransformMode("resize");
      setSelectionTransformCenter(null);
      setTool("select");
    },
    [canvasState, commitState, naming, simpleTraceSource]
  );
  const getCanvasViewport = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect();

    return {
      left: rect?.left ?? 0,
      top: rect?.top ?? 0,
      size: {
        width: rect?.width || svgRef.current?.clientWidth || window.innerWidth,
        height:
          rect?.height || svgRef.current?.clientHeight || window.innerHeight
      }
    };
  }, []);
  const commitViewportTransform = useCallback(
    (nextTransform: { pan: Point; zoom: number }) => {
      panRef.current = nextTransform.pan;
      zoomRef.current = nextTransform.zoom;
      setPan(nextTransform.pan);
      setZoom(nextTransform.zoom);
    },
    []
  );
  const zoomByStepAtPoint = useCallback(
    (step: number, pivot: Point) => {
      commitViewportTransform(
        zoomViewportAtPoint(
          { pan: panRef.current, zoom: zoomRef.current },
          zoomRef.current + step,
          pivot
        )
      );
    },
    [commitViewportTransform]
  );
  const zoomAtClientPoint = useCallback(
    (point: Point, zoomOut: boolean) => {
      const viewport = getCanvasViewport();
      zoomByStepAtPoint(zoomOut ? -ZOOM_CLICK_STEP : ZOOM_CLICK_STEP, {
        x: point.x - viewport.left,
        y: point.y - viewport.top
      });
    },
    [getCanvasViewport, zoomByStepAtPoint]
  );
  const zoomToWorldBounds = useCallback(
    (bounds: Bounds) => {
      const viewport = getCanvasViewport();
      const nextTransform = fitBoundsInViewport(bounds, viewport.size, {
        padding: 0
      });

      if (nextTransform) {
        commitViewportTransform(nextTransform);
      }
    },
    [commitViewportTransform, getCanvasViewport]
  );
  const onCanvasWheel = useCallback(
    (event: ReactWheelEvent<SVGSVGElement>) => {
      if (
        (tool === "select" || tool === "nodeEdit" || tool === "zoom") &&
        event.deltaY !== 0
      ) {
        event.preventDefault();
        const { size } = getCanvasViewport();
        zoomByStepAtPoint(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP, {
          x: size.width / VIEWPORT_CENTER_DIVISOR,
          y: size.height / VIEWPORT_CENTER_DIVISOR
        });
        return;
      }

      if (tool === "hand" && (event.deltaX !== 0 || event.deltaY !== 0)) {
        event.preventDefault();
        const delta = {
          x: event.deltaX || (event.shiftKey ? event.deltaY : 0),
          y: event.shiftKey && event.deltaX === 0 ? 0 : event.deltaY
        };
        const nextPan = panViewportByWheel(panRef.current, delta);

        panRef.current = nextPan;
        setPan(nextPan);
      }
    },
    [getCanvasViewport, tool, zoomByStepAtPoint]
  );
  const applyViewportZoomAction = useCallback(
    (action: ViewportZoomAction) => {
      const viewport = getCanvasViewport();
      const allElements = canvasStateRef.current.elements;
      const isPageAction =
        action === "page" ||
        action === "pageWidth" ||
        action === "pageHeight";
      const bounds =
        action === "selected"
          ? getElementsViewportBounds(selectedElements)
          : action === "all"
            ? getElementsViewportBounds(allElements)
            : getLogicalPageBounds(allElements, viewport.size);

      if (!bounds || (!isPageAction && allElements.length === 0)) {
        return;
      }

      const nextTransform = fitBoundsInViewport(bounds, viewport.size, {
        mode:
          action === "pageWidth"
            ? "width"
            : action === "pageHeight"
              ? "height"
              : "contain",
        padding: isPageAction ? 20 : 40
      });

      if (nextTransform) {
        commitViewportTransform(nextTransform);
      }
    },
    [commitViewportTransform, getCanvasViewport, selectedElements]
  );
  const canCopySelection =
    selectedElements.length > EMPTY_COLLECTION_LENGTH;
  const canBreakApartSvg = selectedElements.some(isBreakApartableSvgElement);
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
        gradientFill: selectedElements[0].gradientFill,
        fillWeight: selectedElements[0].fillWeight ?? DEFAULT_FILL_WEIGHT,
        opacity: selectedElements[0].opacity,
        opacityEnabled:
          selectedElements[0].opacityEnabled ?? selectedElements[0].opacity < 100,
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
  const canBreakApartLineCombination = canBreakApartLineCombinationSelection(
    canvasState.elements,
    canvasState.selectedIds
  );
  const canBreakApart = canBreakApartSvg || canBreakApartLineCombination;
  const showCombineLines =
    objectBaseElements.length > EMPTY_COLLECTION_LENGTH &&
    !canBreakApartLineCombination;
  const canCombineLines =
    !canBreakApartLineCombination &&
    objectBaseElements.length > SINGLE_SELECTION_COUNT &&
    objectBaseElements.every(
      (element) => element.type === "line" || element.type === "arrow"
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
      const image = new Image();
      let committed = false;
      let fallbackTimer: number | null = null;
      const commitImage = (size = DEFAULT_IMAGE_SIZE) => {
        if (committed) {
          return;
        }

        committed = true;
        image.onload = null;
        image.onerror = null;
        if (fallbackTimer !== null) {
          window.clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
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
      if (!committed) {
        fallbackTimer = window.setTimeout(
          () => commitImage(),
          IMAGE_LOAD_FALLBACK_TIMEOUT_MS
        );
      }
    },
    [beginLoading, commitState, defaultStyle, getPastePoint, naming]
  );

  const readClipboardImage = useCallback(
    (file: Blob, copiedExport?: CopiedPngExport, pastePoint?: Point) => {
      const endLoading = beginLoading();
      const reader = new FileReader();
      const finishReading = () => {
        reader.onload = null;
        reader.onerror = null;
        endLoading();
      };

      reader.onload = () => {
        if (typeof reader.result === "string") {
          insertPastedImage(reader.result, copiedExport, pastePoint);
        }
        finishReading();
      };
      reader.onerror = finishReading;
      reader.readAsDataURL(file);
    },
    [beginLoading, insertPastedImage]
  );

  const insertPastedSvgCode = useCallback(
    (svgCode: string, pastePoint = getPastePoint()) => {
      const elements = canvasStateRef.current.elements;
      const importedElements = importSvgElements(svgCode, {
        existingElements: elements,
        fallbackStyle: defaultStyle,
        naming,
        position: pastePoint
      });

      if (!importedElements) {
        return false;
      }

      commitState({
        elements: [...elements, ...importedElements],
        selectedBend: undefined,
        selectedIds: importedElements.map((element) => element.id)
      });
      setPendingImageSize(null);
      setPendingImageSrc(null);
      setTool("select");

      return true;
    },
    [commitState, defaultStyle, getPastePoint, naming]
  );

  const deleteSelected = useCallback(() => {
    if (canvasState.selectedNodes) {
      const { elementId, nodeIndices } = canvasState.selectedNodes;
      const selectedNodeElement = canvasState.elements.find(
        (element) => element.id === elementId
      );
      const bends = selectedNodeElement
        ? getElementBends(selectedNodeElement)
        : [];
      const bendIndicesToDelete = new Set(
        nodeIndices
          .map((nodeIndex) => nodeIndex - 1)
          .filter((bendIndex) => bendIndex >= 0 && bendIndex < bends.length)
      );

      commitState({
        ...canvasState,
        elements:
          selectedNodeElement && bendIndicesToDelete.size > 0
            ? canvasState.elements.map((element) =>
                element.id === elementId
                  ? {
                      ...element,
                      bends: bends.filter(
                        (_, index) => !bendIndicesToDelete.has(index)
                      ),
                      curve: undefined,
                      linearSegmentControls: undefined
                    }
                  : element
              )
            : canvasState.elements,
        selectedBend: undefined,
        selectedIds: selectedNodeElement ? [elementId] : canvasState.selectedIds,
        selectedNodes: undefined
      });
      return;
    }

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
                      curve: undefined,
                      linearSegmentControls: undefined
                    }
                  : element
              )
            : canvasState.elements,
        selectedBend: undefined,
        selectedIds: selectedBendElement ? [elementId] : canvasState.selectedIds,
        selectedNodes: undefined
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
      selectedNodes: undefined,
      selectedIds: []
    });
    setEditingTextElementId(null);
  }, [canvasState, commitState, selectedIdSet]);

  const cutSelected = useCallback(() => {
    if (selectedElements.length === EMPTY_COLLECTION_LENGTH) {
      return;
    }

    clipboardRef.current = selectedElements.map((element) => ({ ...element }));
    deleteSelected();
  }, [deleteSelected, selectedElements]);

  const getSelectedLinearNodeState = useCallback(() => {
    const elementId =
      canvasState.selectedNodes?.elementId ??
      canvasState.selectedBend?.elementId ??
      selectedElements[0]?.id;
    const lineSelections = canvasState.selectedNodes
      ? getSelectedLinearNodeSelections(canvasState.selectedNodes)
          .flatMap((selection) => {
            const selectionElement = canvasState.elements.find(
              (item) =>
                item.id === selection.elementId &&
                (item.type === "line" || item.type === "arrow")
            );

            return selectionElement
              ? [
                  {
                  bends: getElementBends(selectionElement),
                  element: selectionElement,
                  nodeIndices: selection.nodeIndices,
                  segmentIndex: selection.segmentIndex
                  }
                ]
              : [];
          })
      : [];
    const element = canvasState.elements.find(
      (item) =>
        item.id === elementId &&
        (item.type === "line" || item.type === "arrow")
    );

    if (!element) {
      return null;
    }

    const bends = getElementBends(element);
    const nodeIndices =
      canvasState.selectedNodes?.elementId === element.id
        ? canvasState.selectedNodes.nodeIndices
        : canvasState.selectedBend?.elementId === element.id
          ? [canvasState.selectedBend.bendIndex + 1]
          : [];
    const bendIndices = nodeIndices
      .map((nodeIndex) => nodeIndex - 1)
      .filter((bendIndex) => bendIndex >= 0 && bendIndex < bends.length);

    return {
      bends,
      bendIndices,
      element,
      lineSelections,
      nodeIndices
    };
  }, [
    canvasState.elements,
    canvasState.selectedBend,
    canvasState.selectedNodes,
    selectedElements
  ]);

  const canUseNodeAction = useCallback(
    (action: NodeEditorAction) => {
      const nodeState = getSelectedLinearNodeState();

      if (!nodeState) {
        return false;
      }

      if (action === "segmentToCurve" || action === "segmentToLine") {
        return true;
      }

      if (action === "addPointBefore") {
        return nodeState.nodeIndices.length === 1 && nodeState.nodeIndices[0] > 0;
      }

      if (action === "deletePoints") {
        return nodeState.bendIndices.length > 0;
      }

      if (action === "mergePoints") {
        const mergeEntries = nodeState.lineSelections.flatMap((selection) =>
          selection.nodeIndices.map((nodeIndex) => ({
            ...selection,
            nodeIndex
          }))
        );
        const firstEntry = mergeEntries[0];
        const sameCombination = Boolean(
          mergeEntries.length === 2 &&
          firstEntry?.element.lineCombinationId &&
          mergeEntries.every(
            (entry) =>
              entry.element.id === firstEntry.element.id ||
              entry.element.lineCombinationId ===
                firstEntry.element.lineCombinationId
          )
        );
        const sameElement =
          mergeEntries.length === 2 &&
          firstEntry &&
          mergeEntries.every(
            (entry) => entry.element.id === firstEntry.element.id
          ) &&
          isStartEndNodeSelection(nodeState.nodeIndices, nodeState.bends);

        return (
          mergeEntries.length === 2 &&
          (sameElement || sameCombination) &&
          mergeEntries.every(
            (entry) =>
              !entry.element.closed &&
              isEndpointNodeIndex(entry.nodeIndex, entry.bends)
          )
        );
      }

      if (action === "splitPoint") {
        return nodeState.bendIndices.length === 1;
      }

      return false;
    },
    [getSelectedLinearNodeState]
  );

  const applyNodeAction = useCallback(
    (action: NodeEditorAction) => {
      const nodeState = getSelectedLinearNodeState();

      if (!nodeState || !canUseNodeAction(action)) {
        return;
      }

      const { bends, bendIndices, element, nodeIndices } = nodeState;

      if (action === "segmentToCurve" || action === "segmentToLine") {
        const segmentIndex =
          canvasState.selectedNodes?.elementId === element.id &&
          canvasState.selectedNodes.segmentIndex !== undefined
            ? canvasState.selectedNodes.segmentIndex
            : nodeIndices[0] !== undefined
              ? Math.max(0, Math.min(nodeIndices[0] - 1, bends.length))
              : 0;
        const nextControls = [...(element.linearSegmentControls ?? [])];

        nextControls[segmentIndex] =
          action === "segmentToCurve"
            ? getDefaultLinearSegmentControl(element, segmentIndex)
            : { mode: "line" };

        commitState({
          ...canvasState,
          elements: canvasState.elements.map((item) =>
            item.id === element.id
              ? {
                  ...item,
                  linearSegmentControls: nextControls
                }
              : item
          ),
          selectedNodes: {
            elementId: element.id,
            nodeIndices,
            segmentIndex
          },
          selectedIds: [element.id]
        });
        return;
      }

      if (action === "deletePoints") {
        deleteSelected();
        return;
      }

      if (action === "addPointBefore") {
        const nodeIndex = nodeIndices[0];
        const segmentIndex = Math.max(0, nodeIndex - 1);
        const linePoints = getLinearElementPoints(element, bends);
        const midpoint = getLinearElementSegmentMidpoint(
          linePoints,
          segmentIndex,
          element.edgeStyle
        );
        const nextBend = {
          x: midpoint.x - element.x,
          y: midpoint.y - element.y
        };
        const nextBends = [
          ...bends.slice(0, segmentIndex),
          nextBend,
          ...bends.slice(segmentIndex)
        ];

        commitState({
          ...canvasState,
          elements: canvasState.elements.map((item) =>
            item.id === element.id
              ? {
                  ...item,
                  bends: nextBends,
                  curve: undefined,
                  linearSegmentControls: undefined
                }
              : item
          ),
          selectedBend: { bendIndex: segmentIndex, elementId: element.id },
          selectedIds: [element.id],
          selectedNodes: {
            elementId: element.id,
            nodeIndices: [segmentIndex + 1],
            segmentIndex
          }
        });
        return;
      }

      if (action === "mergePoints") {
        const mergeEntries = nodeState.lineSelections.flatMap((selection) =>
          selection.nodeIndices.map((nodeIndex) => ({
            ...selection,
            nodeIndex
          }))
        );
        const firstEntry = mergeEntries[0];
        const targetPoint = firstEntry
          ? getLinearNodeWorldPoint(
              firstEntry.element,
              firstEntry.bends,
              firstEntry.nodeIndex
            )
          : null;

        if (!firstEntry || !targetPoint) {
          return;
        }

        const entriesByElement = new Map<string, typeof mergeEntries>();

        for (const entry of mergeEntries) {
          entriesByElement.set(entry.element.id, [
            ...(entriesByElement.get(entry.element.id) ?? []),
            entry
          ]);
        }

        const closesSingleElement =
          entriesByElement.size === 1 &&
          isStartEndNodeSelection(nodeIndices, bends);

        if (entriesByElement.size === 2) {
          const secondEntry = mergeEntries.find(
            (entry) => entry.element.id !== firstEntry.element.id
          );
          const lineCombinationId = firstEntry.element.lineCombinationId;

          if (!secondEntry) {
            return;
          }

          const merged = createMergedLinearElement(
            firstEntry,
            secondEntry,
            targetPoint
          );
          const remainingCombinationMembers = lineCombinationId
            ? canvasState.elements.filter(
                (item) =>
                  item.id !== firstEntry.element.id &&
                  item.id !== secondEntry.element.id &&
                  item.lineCombinationId === lineCombinationId
              ).length
            : 0;

          commitState({
            ...canvasState,
            elements: canvasState.elements.flatMap((item) => {
              if (item.id === firstEntry.element.id) {
                return [merged.element];
              }

              if (item.id === secondEntry.element.id) {
                return [];
              }

              return [
                lineCombinationId &&
                item.lineCombinationId === lineCombinationId &&
                remainingCombinationMembers < 2
                  ? { ...item, lineCombinationId: undefined }
                  : item
              ];
            }),
            selectedBend: undefined,
            selectedIds: [merged.element.id],
            selectedNodes: {
              elementId: merged.element.id,
              nodeIndices: [merged.joinedNodeIndex],
              segmentIndex: Math.max(0, merged.joinedNodeIndex - 1)
            }
          });
          return;
        }

        commitState({
          ...canvasState,
          elements: canvasState.elements.map((item) => {
            const entries = entriesByElement.get(item.id);

            if (!entries) {
              return item;
            }

            const movedElement = entries.reduce<KizkattElement>(
              (currentElement, entry) =>
                moveLinearNodeToWorldPoint(
                  currentElement,
                  getElementBends(currentElement),
                  entry.nodeIndex,
                  targetPoint
              ),
              item
            );
            const nextElement =
              closesSingleElement && item.id === firstEntry.element.id
                ? closeLinearElementAtStart(movedElement, getElementBends(movedElement))
                : movedElement;

            return withUpdatedObjectBase({
              ...nextElement,
              curve: undefined
            });
          }),
          selectedBend: undefined,
          selectedIds: Array.from(entriesByElement.keys()),
          selectedNodes: closesSingleElement
            ? {
                elementId: firstEntry.element.id,
                nodeIndices: [0],
                segmentIndex: 0
              }
            : {
                elementId: firstEntry.element.id,
                lineSelections: nodeState.lineSelections.map((selection) => ({
                  elementId: selection.element.id,
                  nodeIndices: selection.nodeIndices,
                  segmentIndex: selection.segmentIndex
                })),
                nodeIndices: firstEntry.nodeIndices,
                segmentIndex: firstEntry.segmentIndex
              }
        });
        return;
      }

      if (action === "splitPoint") {
        const bendIndex = bendIndices[0];
        const linePoints = getLinearElementPoints(element, bends);
        const segmentControls = getLinearElementSegmentControls(
          element,
          linePoints
        );
        const firstLinePoints = linePoints.slice(0, bendIndex + 2);
        const secondLinePoints = linePoints.slice(bendIndex + 1);
        const firstControls = segmentControls.slice(0, bendIndex + 1);
        const secondControls = segmentControls.slice(bendIndex + 1);
        const secondElementId = createId();
        const secondElementName = buildElementName(
          element.type,
          canvasState.elements,
          naming
        );
        const lineCombinationId = element.lineCombinationId ?? createId();
        const firstElement = {
          ...createSplitLinearElement(
            element,
            element.id,
            element.name,
            firstLinePoints,
            firstControls,
            "first"
          ),
          lineCombinationId
        };
        const secondElement = {
          ...createSplitLinearElement(
            element,
            secondElementId,
            secondElementName,
            secondLinePoints,
            secondControls,
            "second"
          ),
          lineCombinationId
        };

        commitState({
          ...canvasState,
          elements: canvasState.elements.flatMap((item) =>
            item.id === element.id
              ? [firstElement, secondElement]
              : [item]
          ),
          selectedBend: undefined,
          selectedIds: [firstElement.id, secondElement.id],
          selectedNodes: undefined
        });
      }
    },
    [
      canUseNodeAction,
      canvasState,
      commitState,
      deleteSelected,
      getSelectedLinearNodeState
    ]
  );

  const groupSelected = useCallback(() => {
    if (!canGroup) {
      return;
    }

    commitState(groupCanvasSelection(canvasState, naming));
  }, [canGroup, canvasState, commitState, naming]);

  const combineSelectedLines = useCallback(() => {
    if (!canCombineLines) {
      return;
    }

    const combinationId = createId();
    const lineIds = new Set(objectBaseElements.map((element) => element.id));
    const primaryElement = objectBaseElements[0];

    commitState({
      ...canvasState,
      elements: canvasState.elements.map((element) =>
        lineIds.has(element.id)
          ? {
              ...element,
              calligraphy: primaryElement.calligraphy,
              calligraphyStretch: primaryElement.calligraphyStretch,
              edgeStyle: primaryElement.edgeStyle,
              lineCombinationId: combinationId,
              opacity: primaryElement.opacity,
              opacityEnabled: primaryElement.opacityEnabled,
              scaleStrokeWithObject: primaryElement.scaleStrokeWithObject,
              sloppiness: primaryElement.sloppiness,
              sloppinessGap: primaryElement.sloppinessGap,
              strokeBehindFill: primaryElement.strokeBehindFill,
              strokeColor: primaryElement.strokeColor,
              strokeLineCount: primaryElement.strokeLineCount,
              strokeStyle: primaryElement.strokeStyle,
              strokeWidth: primaryElement.strokeWidth
            }
          : element
      ),
      selectedBend: undefined,
      selectedIds: objectBaseElements.map((element) => element.id),
      selectedNodes: undefined
    });
  }, [canCombineLines, canvasState, commitState, objectBaseElements]);

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

    const lineCombinationState = canBreakApartLineCombination
      ? breakApartLineCombinationCanvasSelection(canvasState)
      : null;
    const svgState = canBreakApartSvg
      ? breakApartCanvasSelection(
          lineCombinationState ?? canvasState,
          selectedElements,
          naming
        )
      : null;
    const nextState = svgState ?? lineCombinationState;

    if (!nextState) {
      return;
    }

    commitState(nextState);
    setEditingTextElementId(null);
  }, [
    canBreakApart,
    canBreakApartLineCombination,
    canBreakApartSvg,
    canvasState,
    commitState,
    naming,
    selectedElements
  ]);

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
        dpi,
        elements: selectedElements,
        elementIds: canvasState.selectedIds,
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
      },
      {
        bitmapTextureScale: {
          x:
            nextGeometry.widthPercent /
            Math.max(
              MIN_OBJECT_GEOMETRY_PERCENT,
              objectPanelGeometry.widthPercent
            ),
          y:
            nextGeometry.heightPercent /
            Math.max(
              MIN_OBJECT_GEOMETRY_PERCENT,
              objectPanelGeometry.heightPercent
            )
        }
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

  const updateSelectedDimension = (
    axis: ObjectDimensionAxis,
    value: number,
    options: {
      preserveAspectRatio: boolean;
      transient?: boolean;
    }
  ) => {
    if (!objectPanelGeometry) {
      return;
    }

    updateSelectedGeometry(
      getObjectDimensionPatch(
        objectPanelGeometry,
        axis,
        value,
        options.preserveAspectRatio
      ),
      { transient: options.transient }
    );
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

    const layeredIds = expandElementIdsToGroups(
      canvasState.elements,
      canvasState.selectedIds
    );

    commitState({
      ...canvasState,
      elements: reorderElementsByLayerAction(
        canvasState.elements,
        layeredIds,
        action
      )
    });
  };

  const getKeyboardNudgeStep = () =>
    gridSettings.unit === "mm"
      ? getCalibratedMillimetersWorldSize(1, gridSettings)
      : 1;

  const nudgeSelected = (delta: Point) => {
    const nudgedIds = new Set(
      expandElementIdsToGroups(canvasState.elements, canvasState.selectedIds)
    );

    if (nudgedIds.size === EMPTY_COLLECTION_LENGTH) {
      return false;
    }

    setSelectionTransformCenter((center) =>
      center ? { x: center.x + delta.x, y: center.y + delta.y } : center
    );
    commitState({
      ...canvasState,
      elements: canvasState.elements.map((element) =>
        nudgedIds.has(element.id) ? translateElement(element, delta) : element
      )
    });

    return true;
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
    currentDocumentHandleRef.current = null;
    currentDocumentFormatRef.current = null;
    currentDocumentArchiveRef.current = true;
    currentDocumentMetaRef.current = null;
    currentDocumentNameRef.current = DEFAULT_SCENE_FILE_NAME;
    setEditingTextElementId(null);
    setMenuOpen(false);
  };

  const refreshPage = () => {
    window.location.reload();
  };

  const getCurrentSceneSettings = (): KizkattSceneSettings =>
    createDefaultKizkattSceneSettings({
      arrowBinding,
      canvasBackgroundColor,
      customCanvasBackgroundColor,
      defaultStyle,
      dpi,
      gridColor,
      gridSettings,
      infoMode,
      pan,
      scale: zoom * 100,
      selectionAreaMode,
      showGrid,
      snapToGrid,
      snapToMidpoints,
      snapToObjects,
      theme,
      uiScale,
      units: gridSettings.unit
    });

  const getUserDefaultSceneSettings = () => {
    const storedTheme = getStoredTheme();
    const storedGridSettings = getStoredGridSettings();

    return createDefaultKizkattSceneSettings({
      canvasBackgroundColor: getStoredCanvasBackgroundColor(storedTheme),
      customCanvasBackgroundColor:
        getStoredCustomCanvasBackgroundColor(storedTheme),
      defaultStyle: defaultElementStyleByTheme[storedTheme],
      dpi: getStoredDpi(),
      gridColor: getStoredGridColor(storedTheme),
      gridSettings: storedGridSettings,
      theme: storedTheme,
      uiScale: getStoredUiScale(),
      units: storedGridSettings.unit
    });
  };

  const applySceneSettings = (settings: KizkattSceneSettings) => {
    setActiveDisplayMode(null);
    setArrowBinding(settings.arrowBinding);
    setCanvasBackgroundColor(settings.canvasBackgroundColor);
    setCustomCanvasBackgroundColor(settings.customCanvasBackgroundColor);
    setDefaultStyle(settings.defaultStyle);
    setDpi(settings.dpi);
    setGridColor(settings.gridColor);
    setGridSettings({ ...settings.gridSettings, unit: settings.units });
    setInfoMode(settings.infoMode);
    setLastDisplayMode("preview");
    setPan(settings.pan);
    setSelectionAreaMode(settings.selectionAreaMode);
    setShowGrid(settings.showGrid);
    setSnapToGrid(settings.snapToGrid);
    setSnapToMidpoints(settings.snapToMidpoints);
    setSnapToObjects(settings.snapToObjects);
    setTheme(settings.theme);
    setUiScale(settings.uiScale);
    setZoom(settings.scale / 100);
  };

  const saveElements = async ({
    archiveKk,
    elements,
    format,
    handle,
    preserveCurrentMetadata,
    suggestedBaseName,
    updateCurrentDocument
  }: {
    archiveKk: boolean;
    elements: KizkattElement[];
    format: SceneFileFormat;
    handle?: SceneFileHandle | null;
    preserveCurrentMetadata: boolean;
    suggestedBaseName: string;
    updateCurrentDocument: boolean;
  }) => {
    const svg = svgRef.current;

    if (format === "svg" && !svg) {
      return false;
    }

    const endLoading = beginLoading();
    const sceneExportState: { document: KizkattSceneDocument | null } = {
      document: null
    };

    try {
      const result = await saveSceneFile({
        archiveKk,
        format,
        handle,
        suggestedBaseName,
        getContents: async () => {
          const sceneExport = await createSceneExport({
            dpi,
            elements,
            format,
            meta: preserveCurrentMetadata
              ? currentDocumentMetaRef.current ?? undefined
              : undefined,
            settings: getCurrentSceneSettings(),
            svg
          });

          if (!sceneExport) {
            throw new Error("The editor canvas is unavailable for SVG export.");
          }

          sceneExportState.document = sceneExport.document;
          return sceneExport.contents;
        }
      });

      if (!result) {
        return false;
      }

      if (updateCurrentDocument) {
        currentDocumentFormatRef.current = result.format;
        if (result.format === "kk") {
          currentDocumentArchiveRef.current = result.archived;
        }
        currentDocumentHandleRef.current = result.handle ?? null;
        currentDocumentMetaRef.current =
          sceneExportState.document?.kk.meta ?? null;
        currentDocumentNameRef.current = result.name;
      }

      return true;
    } finally {
      endLoading();
      setMenuOpen(false);
    }
  };

  const saveCanvas = (
    format: SceneFileFormat = currentDocumentFormatRef.current ?? "kk",
    {
      archiveKk = currentDocumentFormatRef.current === "kk"
        ? currentDocumentArchiveRef.current
        : true,
      saveAs = false
    }: { archiveKk?: boolean; saveAs?: boolean } = {}
  ) =>
    saveElements({
      archiveKk,
      elements: canvasStateRef.current.elements,
      format,
      handle:
        !saveAs &&
        format === currentDocumentFormatRef.current
          ? currentDocumentHandleRef.current
          : null,
      preserveCurrentMetadata: true,
      suggestedBaseName: currentDocumentNameRef.current,
      updateCurrentDocument: true
    });

  const exportSelection = (
    format: SceneFileFormat = "kk",
    archiveKk = true
  ) => {
    const activeState = canvasStateRef.current;
    const selectedIds = new Set(activeState.selectedIds);
    const elements = activeState.elements.filter((element) =>
      selectedIds.has(element.id)
    );

    if (elements.length === 0) {
      return Promise.resolve(false);
    }

    return saveElements({
      archiveKk,
      elements,
      format,
      handle: null,
      preserveCurrentMetadata: false,
      suggestedBaseName: `${currentDocumentNameRef.current.replace(
        /\.(?:kk|svg)$/i,
        ""
      )}-selection`,
      updateCurrentDocument: false
    });
  };

  const resetEditingStateAfterDocumentChange = () => {
    setEditingTextElementId(null);
    setPendingImageSize(null);
    setPendingImageSrc(null);
    setSelectionTransformCenter(null);
    setTool("select");
  };

  const loadDocumentFromFile = async () => {
    const endLoading = beginLoading();

    try {
      const loadedFile = await loadSceneFile({ format: "kk" });

      if (!loadedFile) {
        return false;
      }

      const userDefaults = getUserDefaultSceneSettings();
      const document = parseKizkattSceneDocument(loadedFile.contents, {
        fallbackSettings: userDefaults,
        naming
      });

      if (!document) {
        return false;
      }

      applySceneSettings(userDefaults);
      applySceneSettings(document.kk.scene.Settings);
      commitState(getKizkattDocumentCanvasState(document, naming));
      currentDocumentFormatRef.current = "kk";
      currentDocumentArchiveRef.current = loadedFile.archived;
      currentDocumentHandleRef.current = loadedFile.handle ?? null;
      currentDocumentMetaRef.current = document.kk.meta;
      currentDocumentNameRef.current = loadedFile.name;
      resetEditingStateAfterDocumentChange();
      return true;
    } finally {
      endLoading();
      setSceneReplacementAction(null);
      setMenuOpen(false);
    }
  };

  const importDocumentFromFile = async (format: SceneFileFormat) => {
    const endLoading = beginLoading();

    try {
      const loadedFile = await loadSceneFile({ format });

      if (!loadedFile) {
        return false;
      }

      const activeState = canvasStateRef.current;
      const importedElements = importSceneElements({
        contents: loadedFile.contents,
        createElementId: createId,
        existingElements: activeState.elements,
        fallbackSettings: getUserDefaultSceneSettings(),
        fallbackStyle: defaultStyle,
        format: loadedFile.format,
        naming
      });

      if (!importedElements) {
        return false;
      }

      commitState({
        elements: [...activeState.elements, ...importedElements],
        selectedBend: undefined,
        selectedIds: importedElements.map((element) => element.id)
      });
      resetEditingStateAfterDocumentChange();
      return true;
    } finally {
      endLoading();
      setMenuOpen(false);
    }
  };

  const createNewScene = () => {
    applySceneSettings(getUserDefaultSceneSettings());
    resetCanvas();
    resetEditingStateAfterDocumentChange();
  };

  const runSceneReplacement = (action: SceneReplacementAction) => {
    if (action === "new") {
      createNewScene();
      setSceneReplacementAction(null);
      return;
    }

    void loadDocumentFromFile();
  };

  const requestSceneReplacement = (action: SceneReplacementAction) => {
    if (canvasStateRef.current.elements.length > 0) {
      setSceneReplacementAction(action);
      setMenuOpen(false);
      return;
    }

    runSceneReplacement(action);
  };

  const saveAndReplaceScene = async () => {
    const action = sceneReplacementAction;

    if (!action) {
      return;
    }

    if (await saveCanvas()) {
      runSceneReplacement(action);
    }
  };

  const replaceSceneWithoutSaving = () => {
    const action = sceneReplacementAction;

    setSceneReplacementAction(null);
    if (action) {
      runSceneReplacement(action);
    }
  };

  const cancelSceneReplacement = () => {
    setSceneReplacementAction(null);
    setMenuOpen(false);
  };

  const openFormatDialog = (action: DocumentFormatDialogAction) => {
    setFormatDialogAction(action);
    setMenuOpen(false);
  };

  const chooseDocumentFormat = ({
    archiveKk,
    format
  }: DocumentFormatSelection) => {
    const action = formatDialogAction;

    setFormatDialogAction(null);
    if (action === "saveAs") {
      void saveCanvas(format, { archiveKk, saveAs: true });
    } else if (action === "import") {
      void importDocumentFromFile(format);
    } else if (action === "export") {
      void exportSelection(format, archiveKk);
    }
  };

  const cancelFormatDialog = () => setFormatDialogAction(null);

  const printCanvas = () => {
    setMenuOpen(false);
    window.print();
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
    const finishReading = () => {
      reader.onload = null;
      reader.onerror = null;
    };

    reader.onload = () => {
      finishReading();
      if (typeof reader.result === "string") {
        const src = reader.result;
        const image = new Image();
        let activated = false;
        let fallbackTimer: number | null = null;
        const activateImageTool = (size: Size) => {
          if (activated) {
            return;
          }

          activated = true;
          image.onload = null;
          image.onerror = null;
          if (fallbackTimer !== null) {
            window.clearTimeout(fallbackTimer);
            fallbackTimer = null;
          }
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
          fallbackTimer = window.setTimeout(
            () => activateImageTool(DEFAULT_IMAGE_SIZE),
            IMAGE_LOAD_FALLBACK_TIMEOUT_MS
          );
        }
      } else {
        endLoading();
      }
    };
    reader.onerror = () => {
      finishReading();
      endLoading();
    };
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
      const contextMenuDefaults = getStoredContextMenuDefaults();

      if (
        key === EDITING_SHORTCUT_KEY.paste &&
        contextMenuDefaults.paste === "clipboard" &&
        clipboardRef.current.length === EMPTY_COLLECTION_LENGTH &&
        !navigator.clipboard?.read &&
        !navigator.clipboard?.readText
      ) {
        return;
      }

      event.preventDefault();

      if (key === EDITING_SHORTCUT_KEY.selectAll) {
        selectAll();
      } else if (key === EDITING_SHORTCUT_KEY.copy) {
        if (contextMenuDefaults.copy === "png") {
          void copyPngToClipboard();
        } else if (contextMenuDefaults.copy === "svg") {
          void copySvgToClipboard();
        } else {
          copySelected();
        }
      } else if (key === EDITING_SHORTCUT_KEY.cut) {
        cutSelected();
      } else if (key === EDITING_SHORTCUT_KEY.group) {
        groupSelected();
      } else if (key === EDITING_SHORTCUT_KEY.load) {
        requestSceneReplacement("load");
      } else if (key === EDITING_SHORTCUT_KEY.new) {
        requestSceneReplacement("new");
      } else if (key === EDITING_SHORTCUT_KEY.paste) {
        if (contextMenuDefaults.paste === "svgCode") {
          void pasteSvgCodeFromContextMenu();
        } else {
          void pasteFromContextMenu();
        }
      } else if (key === EDITING_SHORTCUT_KEY.print) {
        printCanvas();
      } else if (key === EDITING_SHORTCUT_KEY.save && event.shiftKey) {
        openFormatDialog("saveAs");
      } else if (key === EDITING_SHORTCUT_KEY.save) {
        void saveCanvas();
      } else if (key === EDITING_SHORTCUT_KEY.ungroup) {
        ungroupSelected();
      } else if (key === EDITING_SHORTCUT_KEY.undo && event.shiftKey) {
        redo();
      } else if (key === EDITING_SHORTCUT_KEY.undo) {
        undo();
      } else if (key === EDITING_SHORTCUT_KEY.redo) {
        redo();
      }

      return;
    }

    if (!event.altKey && !event.ctrlKey && !event.metaKey) {
      const step = getKeyboardNudgeStep();
      const nudgeDelta =
        event.key === EDITOR_KEY.arrowLeft
          ? { x: -step, y: 0 }
          : event.key === EDITOR_KEY.arrowRight
            ? { x: step, y: 0 }
            : event.key === EDITOR_KEY.arrowUp
              ? { x: 0, y: -step }
              : event.key === EDITOR_KEY.arrowDown
                ? { x: 0, y: step }
                : null;

      if (nudgeDelta && nudgeSelected(nudgeDelta)) {
        event.preventDefault();
        return;
      }
    }

    if (!event.altKey && !event.ctrlKey && !event.metaKey && event.shiftKey) {
      if (event.key === EDITOR_KEY.pageUp) {
        event.preventDefault();
        applyLayerAction("front");
        return;
      }

      if (event.key === EDITOR_KEY.pageDown) {
        event.preventDefault();
        applyLayerAction("back");
        return;
      }
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
    contextualFillElementId,
    dismissContextualFillControl,
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
      onZoomAtClientPoint: zoomAtClientPoint,
      onZoomToBounds: zoomToWorldBounds,
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

  useCanvasAutosave({
    save: storeCanvasState,
    state: canvasState,
    suspended: Boolean(interaction)
  });

  const canvasCursor =
    getInteractionCursor(interaction, theme) ??
    getCanvasCursor({
      hasSelection: selectedElements.length > EMPTY_COLLECTION_LENGTH,
      isPanning: interaction?.type === "pan",
      theme,
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
  const elementsInViewport = useMemo(
    () => visibleElementIndices
      ? visibleElementIndices.flatMap((elementIndex) => {
          const element = canvasState.elements[elementIndex];

          return element ? [element] : [];
        })
      : canvasState.elements,
    [canvasState.elements, visibleElementIndices]
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

    return canvasState.elements.flatMap((element, index) =>
      visibleElementIds.has(element.id) ||
      (element.groupId && visibleGroupIds.has(element.groupId))
        ? [
            {
              element,
              layerNumber: index + 1
            }
          ]
        : []
    );
  }, [canvasState.elements, elementsInViewport, infoMode]);
  const displayElements = useMemo(
    () => getPreviewDisplayElements(
      elementsInViewport,
      previewTransformInteraction
    ),
    [
      elementsInViewport,
      previewTransformInteraction?.originalElements,
      previewTransformInteraction?.selectedIds
    ]
  );
  const imagePlacementBounds =
    tool === "image" && pendingImageSrc
      ? getImagePlacementBounds(
          interaction,
          imagePreviewPoint,
          pendingImageSize ?? DEFAULT_IMAGE_SIZE
        )
      : null;
  const contextualFillElement =
    activeDisplayMode !== "preview" && selectedElements.length === 1
      ? selectedElements.find(
          (element) => element.id === contextualFillElementId
        ) ?? null
      : null;
  const contextualFillStyle: ContextualFillStyle | null =
    contextualFillElement?.fillStyle === "gradient" ||
    contextualFillElement?.fillStyle === "monochromeTexture"
      ? contextualFillElement.fillStyle
      : null;
  const getElementSelectionRenderState = (element: KizkattElement) => {
    const isSelected = selectedIdSet.has(element.id);
    const isNodeEditableLine =
      tool === "nodeEdit" && (element.type === "line" || element.type === "arrow");
    const showPrimaryOverlay =
      !previewTransformInteraction &&
      (selectedElements.length <= SINGLE_SELECTION_COUNT ||
        isNodeEditableLine) &&
      isSelected;
    const showInternalOverlay =
      !previewTransformInteraction &&
      selectedElements.length > SINGLE_SELECTION_COUNT &&
      isSelected &&
      !isNodeEditableLine;
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
    const selectedNodeSelection = getSelectedNodeSelectionForElement(
      canvasState.selectedNodes,
      element.id
    );

    const options: KizkattRenderElementOptions = {
      canvasBackgroundColor:
        activeDisplayMode === "wireframe"
          ? "var(--kizkatt-wireframe-canvas)"
          : canvasBackgroundColor,
      linearEndpointMode: tool === "nodeEdit" ? "node" : "resize",
      selectedBendIndex:
        canvasState.selectedBend?.elementId === element.id
          ? canvasState.selectedBend.bendIndex
          : undefined,
      selectedNodeIndices:
        selectedNodeSelection?.nodeIndices ??
        (canvasState.selectedBend?.elementId === element.id
          ? [canvasState.selectedBend.bendIndex + 1]
          : undefined),
      selectedSegmentIndex:
        selectedNodeSelection?.segmentIndex ??
        (canvasState.selectedBend?.elementId === element.id
            ? canvasState.selectedBend.bendIndex
            : undefined),
      segmentBendActive:
        interaction?.type === "linearSegmentBend" &&
        interaction.elementId === element.id,
      selectionTransformCenter,
      selectionTransformMode,
      showLinearBendHandles:
        tool === "nodeEdit" && !isCreatingLinearElement,
      showLinearBezierHandles:
        tool === "nodeEdit" && !isCreatingLinearElement,
      showLinearNodePreview:
        tool === "select" && !isCreatingLinearElement,
      showRotateHoverIcon: !isRotatingSelection,
      showRotateHandle: DEFAULT_SHOW_ROTATE_HANDLE && !isCreatingElement,
      showSelectionBounds: !isRotatingSelection,
      theme,
      wireframe: activeDisplayMode === "wireframe",
      zoom
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
    contextualFillControl:
      contextualFillElement && contextualFillStyle
        ? {
            element: contextualFillElement,
            fillStyle: contextualFillStyle,
            onActivate: () => {
              fillSettingsRequestIdRef.current += 1;
              setFillSettingsRequest({
                fillStyle: contextualFillStyle,
                id: fillSettingsRequestIdRef.current
              });
              dismissContextualFillControl();
            }
          }
        : null,
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
    onWheel: onCanvasWheel,
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
      canCombineLines,
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
      onCombineLines: combineSelectedLines,
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
      snapToObjects,
      showCombineLines
    },
    documentControls: {
      activeDisplayMode,
      canExport: canCopySelection,
      formatDialogAction,
      lastDisplayMode,
      menuOpen,
      onCancelFormatDialog: cancelFormatDialog,
      onCancelSceneReplacement: cancelSceneReplacement,
      onChooseFormat: chooseDocumentFormat,
      onConfirmSceneReplacementWithoutSaving: replaceSceneWithoutSaving,
      onConfirmSaveAndReplaceScene: () => void saveAndReplaceScene(),
      onExport: () => openFormatDialog("export"),
      onImport: () => openFormatDialog("import"),
      onLoad: () => requestSceneReplacement("load"),
      onMenuOpenChange: setMenuOpen,
      onNew: () => requestSceneReplacement("new"),
      onPrint: printCanvas,
      onSave: () => void saveCanvas(),
      onSaveAs: () => openFormatDialog("saveAs"),
      onThemeChange: setStoredTheme,
      onToggleLastDisplayMode: () => toggleDisplayMode(lastDisplayMode),
      sceneReplacementAction,
      theme
    },
    imageInputBindings: {
      accept: IMAGE_FILE_ACCEPT,
      onChange: onImageFileChange,
      ref: imageInputRef
    },
    simpleTraceControls: simpleTraceSource
      ? {
          onApply: applySimpleTrace,
          sourceElement: simpleTraceSource
        }
      : null,
    selectionGeometryControls:
      objectPanelGeometry || canEditDefaultStroke || tool === "zoom"
      ? {
          activeTool: tool,
          canUseNodeAction,
          canZoomToAll:
            canvasState.elements.length > EMPTY_COLLECTION_LENGTH,
          canZoomToSelected:
            selectedElements.length > EMPTY_COLLECTION_LENGTH,
          geometry: objectPanelGeometry,
          gridSettings,
          onAction: applyElementAction,
          onDimensionChange: updateSelectedDimension,
          onGeometryChange: updateSelectedGeometry,
          onGeometryChangeEnd: endSelectedGeometryChange,
          onLayerAction: applyLayerAction,
          onMirror: mirrorSelected,
          onNodeAction: applyNodeAction,
          onStyleChange: updateSelectedStyle,
          onStyleChangeEnd: endSelectedStyleChange,
          onViewportZoomAction: applyViewportZoomAction,
          selectedElements,
          style: panelStyle,
          theme
        }
      : null,
    state: {
      fillSettingsRequest,
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
      canvasBackgroundColor,
      canRedo,
      canUndo,
      canUseGrid: gridHasVisibleLayer,
      customCanvasBackgroundColor,
      dpi,
      gridColor,
      gridSettings,
      infoMode,
      onCanvasBackgroundChange: setStoredCanvasBackground,
      onGridColorChange: setStoredGridColor,
      onGridSettingsChange: setStoredGridSettings,
      onDpiChange: setStoredDpi,
      onPickCanvasBackground: () => void pickCanvasBackground(),
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
