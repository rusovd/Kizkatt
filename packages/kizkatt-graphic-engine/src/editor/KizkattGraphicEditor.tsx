import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import type {
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent
} from "react";

import {
  DEFAULT_ELEMENT_STYLE_BY_THEME,
  ARROW_MARKER_HEIGHT,
  ARROW_MARKER_ORIENT,
  ARROW_MARKER_PATH,
  ARROW_MARKER_REF_X,
  ARROW_MARKER_REF_Y,
  ARROW_MARKER_VIEW_BOX,
  ARROW_MARKER_WIDTH,
  CANVAS_TAB_INDEX,
  DEFAULT_BOARD_ARIA_LABEL,
  DEFAULT_ARROW_MARKER_ID,
  DEFAULT_CANVAS_ARIA_LABEL,
  DEFAULT_EDGE_STYLE,
  DEFAULT_FILL_STYLE,
  DEFAULT_FILL_WEIGHT,
  DEFAULT_IMAGE_INPUT_ARIA_LABEL,
  DEFAULT_ZOOM,
  DEFAULT_SELECTED_SLOPPINESS,
  EMPTY_COLLECTION_LENGTH,
  DUPLICATED_ELEMENT_OFFSET,
  EMPTY_INPUT_VALUE,
  DEFAULT_IMAGE_SIZE,
  EXPORT_CANVAS_IMAGE_ERROR_MESSAGE,
  IMAGE_LOAD_FALLBACK_TIMEOUT_MS,
  IMAGE_FILE_ACCEPT,
  IMAGE_MIME_TYPE_PREFIX,
  INITIAL_PAN,
  MAX_PASTED_IMAGE_SIZE,
  MAX_ZOOM,
  MIN_PIXEL_SIZE,
  MIN_ZOOM,
  PASTED_TEXT_CHARACTER_WIDTH,
  PASTED_TEXT_LINE_HEIGHT,
  PASTED_TEXT_MAX_WIDTH,
  PLAIN_TEXT_MIME_TYPE,
  PNG_IMAGE_MIME_TYPE,
  SELECTION_LINK_PREFIX,
  SINGLE_SELECTION_COUNT,
  SVG_IMAGE_MIME_TYPE,
  TEXT_ELEMENT_DEFAULT_HEIGHT,
  TEXT_ELEMENT_DEFAULT_WIDTH,
  TRANSPARENT_COLOR,
  VIEWPORT_CENTER_DIVISOR,
  ZOOM_STEP
} from "../config/constants";
import { createElement, createId } from "../model/element";
import {
  createElementName as buildElementName,
  createGroupName,
  normalizeElementNames
} from "../model/naming";
import type { ElementNamingConfig } from "../model/naming";
import {
  canGroupSelection,
  canUngroupSelection,
  cloneElementsWithFreshIdsAndGroups,
  expandElementIdsToGroups,
  groupSelectedElements,
  ungroupSelectedElements
} from "../model/groups";
import { getElementBends, reorderElementsByLayerAction } from "../geometry";
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
  getStoredGridColor,
  getStoredQuickCanvasState,
  getStoredTheme,
  getStoredUiScale,
  storeCanvasBackgroundColor,
  storeCanvasState,
  storeCustomCanvasBackgroundColor,
  storeGridColor,
  storeQuickCanvasState,
  storeTheme,
  storeUiScale
} from "../platform/storage";
import { useToolPointerHandlers } from "../tools/pointer";
import type {
  ContextMenuState,
  Interaction,
  KizkattElement,
  Point,
  StyleState,
  KizkattTheme,
  Tool
} from "../model/types";

type EyeDropperConstructor = new () => {
  open: () => Promise<{ sRGBHex: string }>;
};

function getFittedImageSize(width: number, height: number) {
  if (width <= 0 || height <= 0) {
    return DEFAULT_IMAGE_SIZE;
  }

  const scale = Math.min(
    1,
    MAX_PASTED_IMAGE_SIZE.width / width,
    MAX_PASTED_IMAGE_SIZE.height / height
  );

  return {
    height: Math.max(MIN_PIXEL_SIZE, Math.round(height * scale)),
    width: Math.max(MIN_PIXEL_SIZE, Math.round(width * scale))
  };
}

export type KizkattRenderElementOptions = {
  selectedBendIndex?: number;
  showLinearBendHandles?: boolean;
  showRotateHandle?: boolean;
  showSelectionBounds?: boolean;
};

export type ToolbarProps = {
  activeTool: Tool;
  onActivateTool: (tool: Tool) => void;
};

export type CanvasContextMenuProps = {
  arrowBinding: boolean;
  canGroup: boolean;
  canUngroup: boolean;
  contextMenu: ContextMenuState | null;
  onCloseAndRun: (action: () => void | Promise<void>) => void;
  onCopyPng: () => Promise<void>;
  onCopySvg: () => Promise<void>;
  onGroup: () => void;
  onPaste: () => void;
  onSelectAll: () => void;
  onUngroup: () => void;
  setArrowBinding: (updater: (value: boolean) => boolean) => void;
  setShowGrid: (updater: (value: boolean) => boolean) => void;
  setSnapToMidpoints: (updater: (value: boolean) => boolean) => void;
  setSnapToObjects: (updater: (value: boolean) => boolean) => void;
  setViewMode: (updater: (value: boolean) => boolean) => void;
  setZenMode: (updater: (value: boolean) => boolean) => void;
  showGrid: boolean;
  snapToMidpoints: boolean;
  snapToObjects: boolean;
  viewMode: boolean;
  zenMode: boolean;
};

export type MainMenuProps = {
  canvasBackgroundColor: string;
  customCanvasBackgroundColor: string;
  gridColor: string;
  menuOpen: boolean;
  onCanvasBackgroundChange: (color: string) => void;
  onExport: () => void;
  onGridColorChange: (color: string) => void;
  onOpen: () => void;
  onPickCanvasBackground: () => void;
  onMenuOpenChange: (open: boolean) => void;
  onResetCanvas: () => void;
  onThemeChange: (theme: KizkattTheme) => void;
  onUiScaleChange: (scale: number) => void;
  theme: KizkattTheme;
  uiScale: number;
};

export type StylePanelProps = {
  activeTool: Tool;
  canToggleClosedPath: boolean;
  closedPath: boolean;
  onAction: (action: "delete" | "duplicate" | "link") => void;
  onClosedPathChange: (closed: boolean) => void;
  onLayerAction: (action: "back" | "backward" | "forward" | "front") => void;
  onStyleChange: (patch: Partial<StyleState>) => void;
  selectedElements: KizkattElement[];
  style: StyleState;
  theme: KizkattTheme;
};

export type TextEditorProps = {
  element: KizkattElement;
  onBlur: () => void;
  onChange: (text: string) => void;
  pan: Point;
  zoom: number;
};

export type KizkattGraphicEditorComponents = {
  CanvasContextMenu: ComponentType<CanvasContextMenuProps>;
  CanvasGrid: ComponentType<{ pan: Point; visible: boolean; zoom: number }>;
  FooterControls: ComponentType<{
    canRedo: boolean;
    canUndo: boolean;
    onRedo: () => void;
    onUndo: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    zoom: number;
  }>;
  MainMenu: ComponentType<MainMenuProps>;
  SelectedBounds: ComponentType<{
    elements: KizkattElement[];
    interaction: Interaction | null;
  }>;
  SelectionArea: ComponentType<{ interaction: Interaction | null }>;
  StylePanel: ComponentType<StylePanelProps>;
  TextEditor: ComponentType<TextEditorProps>;
  Toolbar: ComponentType<ToolbarProps>;
};

export type KizkattGraphicEditorProps = {
  arrowMarkerId?: string;
  boardAriaLabel?: string;
  boardClassName?: string;
  boardThemeClassName?: (theme: KizkattTheme) => string;
  canvasAriaLabel?: string;
  canvasClassName?: string;
  components: KizkattGraphicEditorComponents;
  defaultElementStyleByTheme?: Record<KizkattTheme, StyleState>;
  fileInputClassName?: string;
  imageInputAriaLabel?: string;
  getCanvasCursor: (state: { isPanning: boolean; tool: Tool }) => string;
  renderElement: (
    element: KizkattElement,
    selected: boolean,
    options?: KizkattRenderElementOptions
  ) => ReactNode;
  serializeSvg: (svg: SVGSVGElement) => string;
  naming?: ElementNamingConfig;
  shouldShowStylePanel: (state: {
    activeTool: Tool;
    selectedElements: KizkattElement[];
  }) => boolean;
  getToolForSelectedElement?: (element: KizkattElement) => Tool | null;
};

function isSameStyle(firstStyle: StyleState, secondStyle: StyleState) {
  return (
    firstStyle.backgroundColor === secondStyle.backgroundColor &&
    firstStyle.edgeStyle === secondStyle.edgeStyle &&
    firstStyle.fillStyle === secondStyle.fillStyle &&
    firstStyle.fillWeight === secondStyle.fillWeight &&
    firstStyle.opacity === secondStyle.opacity &&
    firstStyle.sloppiness === secondStyle.sloppiness &&
    firstStyle.sloppinessGap === secondStyle.sloppinessGap &&
    firstStyle.strokeColor === secondStyle.strokeColor &&
    firstStyle.strokeStyle === secondStyle.strokeStyle &&
    firstStyle.strokeWidth === secondStyle.strokeWidth
  );
}

export function KizkattGraphicEditor({
  arrowMarkerId = DEFAULT_ARROW_MARKER_ID,
  boardAriaLabel = DEFAULT_BOARD_ARIA_LABEL,
  boardClassName = "kizkatt-board",
  boardThemeClassName = (theme) => `kizkatt-board--${theme}`,
  canvasAriaLabel = DEFAULT_CANVAS_ARIA_LABEL,
  canvasClassName = "kizkatt-canvas",
  components,
  defaultElementStyleByTheme = DEFAULT_ELEMENT_STYLE_BY_THEME,
  fileInputClassName = "kizkatt-file-input",
  getCanvasCursor,
  getToolForSelectedElement,
  imageInputAriaLabel = DEFAULT_IMAGE_INPUT_ARIA_LABEL,
  naming,
  renderElement,
  serializeSvg,
  shouldShowStylePanel
}: KizkattGraphicEditorProps) {
  const {
    CanvasContextMenu,
    CanvasGrid,
    FooterControls,
    MainMenu,
    SelectedBounds,
    SelectionArea,
    StylePanel,
    TextEditor,
    Toolbar
  } = components;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const clipboardRef = useRef<KizkattElement[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<KizkattTheme>(() => getStoredTheme());
  const [uiScale, setUiScale] = useState(() => getStoredUiScale());
  const [canvasBackgroundColor, setCanvasBackgroundColor] = useState(() =>
    getStoredCanvasBackgroundColor(getStoredTheme())
  );
  const [customCanvasBackgroundColor, setCustomCanvasBackgroundColor] =
    useState(() => getStoredCustomCanvasBackgroundColor(getStoredTheme()));
  const [gridColor, setGridColor] = useState(() =>
    getStoredGridColor(getStoredTheme())
  );
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState<Point>(() => ({ ...INITIAL_PAN }));
  const [style, setStyle] = useState<StyleState>(
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
    replaceActiveState,
    undo
  } = useCanvasHistory(initialCanvasState);
  const [editingTextElementId, setEditingTextElementId] = useState<
    string | null
  >(null);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToObjects, setSnapToObjects] = useState(false);
  const [arrowBinding, setArrowBinding] = useState(true);
  const [snapToMidpoints, setSnapToMidpoints] = useState(true);
  const [zenMode, setZenMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);

  const canvasStateRef = useRef(canvasState);
  canvasStateRef.current = canvasState;
  useEffect(() => {
    storeCanvasState(canvasState);
  }, [canvasState]);
  const selectedElements = useMemo(
    () =>
      canvasState.elements.filter((element) =>
        canvasState.selectedIds.includes(element.id)
      ),
    [canvasState]
  );
  const editingTextElement = canvasState.elements.find(
    (element) => element.id === editingTextElementId && element.type === "text"
  );
  const panelStyle: StyleState = selectedElements[0]
    ? {
        backgroundColor: selectedElements[0].backgroundColor,
        edgeStyle: selectedElements[0].edgeStyle ?? DEFAULT_EDGE_STYLE,
        fillStyle: selectedElements[0].fillStyle ?? DEFAULT_FILL_STYLE,
        fillWeight: selectedElements[0].fillWeight ?? DEFAULT_FILL_WEIGHT,
        opacity: selectedElements[0].opacity,
        sloppiness: selectedElements[0].sloppiness ?? DEFAULT_SELECTED_SLOPPINESS,
        sloppinessGap: selectedElements[0].sloppinessGap ?? style.sloppinessGap,
        strokeColor: selectedElements[0].strokeColor,
        strokeStyle: selectedElements[0].strokeStyle,
        strokeWidth: selectedElements[0].strokeWidth
      }
    : style;
  const showStylePanel =
    !menuOpen &&
    shouldShowStylePanel({
      activeTool: tool,
      selectedElements
    });
  const canGroup = canGroupSelection(
    canvasState.elements,
    canvasState.selectedIds
  );
  const canUngroup = canUngroupSelection(
    canvasState.elements,
    canvasState.selectedIds
  );

  const selectAll = useCallback(() => {
    replaceActiveState({
      ...canvasState,
      selectedBend: undefined,
      selectedIds: canvasState.elements.map((element) => element.id)
    });
  }, [canvasState, replaceActiveState]);

  const copySelected = useCallback(() => {
    clipboardRef.current = selectedElements.map((element) => ({ ...element }));
  }, [selectedElements]);

  const pasteSelected = useCallback(() => {
    if (clipboardRef.current.length === EMPTY_COLLECTION_LENGTH) {
      return;
    }

    const pastedElements = cloneElementsWithFreshIdsAndGroups(
      clipboardRef.current,
      createId,
      DUPLICATED_ELEMENT_OFFSET,
      canvasState.elements,
      naming
    );

    commitState({
      elements: [...canvasState.elements, ...pastedElements],
      selectedBend: undefined,
      selectedIds: pastedElements.map((element) => element.id)
    });
  }, [canvasState.elements, commitState, naming]);

  const duplicateSelected = useCallback(() => {
    if (selectedElements.length === 0) {
      return;
    }

    const duplicatedElements = cloneElementsWithFreshIdsAndGroups(
      selectedElements,
      createId,
      DUPLICATED_ELEMENT_OFFSET,
      canvasState.elements,
      naming
    );

    commitState({
      elements: [...canvasState.elements, ...duplicatedElements],
      selectedBend: undefined,
      selectedIds: duplicatedElements.map((element) => element.id)
    });
  }, [canvasState.elements, commitState, naming, selectedElements]);

  const getPastePoint = useCallback(() => {
    const canvasRect = svgRef.current?.getBoundingClientRect();
    const clientPoint = canvasRect
      ? {
          x: canvasRect.left + canvasRect.width / VIEWPORT_CENTER_DIVISOR,
          y: canvasRect.top + canvasRect.height / VIEWPORT_CENTER_DIVISOR
        }
      : {
          x: window.innerWidth / VIEWPORT_CENTER_DIVISOR,
          y: window.innerHeight / VIEWPORT_CENTER_DIVISOR
        };

    return {
      x: (clientPoint.x - pan.x) / zoom,
      y: (clientPoint.y - pan.y) / zoom
    };
  }, [pan, zoom]);

  const insertPastedText = useCallback(
    (text: string) => {
      const trimmedText = text.trim();

      if (!trimmedText) {
        return false;
      }

      const lines = trimmedText.split(/\r\n|\r|\n/);
      const longestLineLength = Math.max(
        ...lines.map((line) => line.length),
        1
      );
      const pastePoint = getPastePoint();
      const elements = canvasStateRef.current.elements;
      const nextElement: KizkattElement = {
        ...createElement("text", pastePoint, style),
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
      };

      commitState({
        elements: [...elements, nextElement],
        selectedBend: undefined,
        selectedIds: [nextElement.id]
      });
      setEditingTextElementId(null);
      setTool("select");

      return true;
    },
    [commitState, getPastePoint, naming, style]
  );

  const insertPastedImage = useCallback(
    (src: string) => {
      const pastePoint = getPastePoint();
      const elements = canvasStateRef.current.elements;
      const baseElement: KizkattElement = {
        ...createElement("image", pastePoint, style),
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
        const nextElement = { ...baseElement, ...size };

        commitState({
          elements: [...canvasStateRef.current.elements, nextElement],
          selectedBend: undefined,
          selectedIds: [nextElement.id]
        });
        setPendingImageSrc(null);
        setTool("select");
      };

      const image = new Image();
      image.onload = () => {
        commitImage(getFittedImageSize(image.naturalWidth, image.naturalHeight));
      };
      image.onerror = () => {
        commitImage();
      };
      image.src = src;

      if (image.complete && image.naturalWidth >= MIN_PIXEL_SIZE) {
        commitImage(getFittedImageSize(image.naturalWidth, image.naturalHeight));
      }
      window.setTimeout(() => commitImage(), IMAGE_LOAD_FALLBACK_TIMEOUT_MS);
    },
    [commitState, getPastePoint, naming, style]
  );

  const readClipboardImage = useCallback(
    (file: File) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === "string") {
          insertPastedImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    },
    [insertPastedImage]
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
        (element) => !canvasState.selectedIds.includes(element.id)
      ),
      selectedBend: undefined,
      selectedIds: []
    });
    setEditingTextElementId(null);
  }, [canvasState, commitState]);

  const copySelectedLink = useCallback(() => {
    if (
      canvasState.selectedIds.length === EMPTY_COLLECTION_LENGTH ||
      !navigator.clipboard?.writeText
    ) {
      return;
    }

    void navigator.clipboard.writeText(
      `${SELECTION_LINK_PREFIX}${canvasState.selectedIds.join(",")}`
    );
  }, [canvasState.selectedIds]);

  const groupSelected = useCallback(() => {
    if (!canGroup) {
      return;
    }

    const selectedIds = expandElementIdsToGroups(
      canvasState.elements,
      canvasState.selectedIds
    );

    commitState({
      elements: groupSelectedElements(
        canvasState.elements,
        selectedIds,
        createId(),
        createGroupName(canvasState.elements, naming)
      ),
      selectedBend: undefined,
      selectedIds
    });
  }, [canGroup, canvasState, commitState, naming]);

  const ungroupSelected = useCallback(() => {
    if (!canUngroup) {
      return;
    }

    const selectedIds = expandElementIdsToGroups(
      canvasState.elements,
      canvasState.selectedIds
    );

    commitState({
      elements: ungroupSelectedElements(canvasState.elements, selectedIds),
      selectedBend: undefined,
      selectedIds
    });
  }, [canUngroup, canvasState, commitState]);

  const copySvgToClipboard = async () => {
    const svg = svgRef.current;

    if (!svg || !navigator.clipboard?.writeText) {
      return;
    }

    await navigator.clipboard.writeText(serializeSvg(svg));
  };

  const copyPngToClipboard = async () => {
    const svg = svgRef.current;

    if (!svg || !("ClipboardItem" in window) || !navigator.clipboard?.write) {
      return;
    }

    const markup = serializeSvg(svg);
    const blob = new Blob([markup], { type: SVG_IMAGE_MIME_TYPE });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(EXPORT_CANVAS_IMAGE_ERROR_MESSAGE));
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    const rect = svg.getBoundingClientRect();
    canvas.width = Math.max(
      MIN_PIXEL_SIZE,
      Math.round(rect.width || window.innerWidth)
    );
    canvas.height = Math.max(
      MIN_PIXEL_SIZE,
      Math.round(rect.height || window.innerHeight)
    );
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, PNG_IMAGE_MIME_TYPE)
    );

    if (pngBlob) {
      await navigator.clipboard.write([
        new ClipboardItem({ [PNG_IMAGE_MIME_TYPE]: pngBlob })
      ]);
    }
  };

  const updateSelectedStyle = (patch: Partial<StyleState>) => {
    setStyle((previousStyle) => ({ ...previousStyle, ...patch }));

    if (canvasState.selectedIds.length === EMPTY_COLLECTION_LENGTH) {
      return;
    }

    commitState({
      ...canvasState,
      elements: canvasState.elements.map((element) =>
        canvasState.selectedIds.includes(element.id)
          ? { ...element, ...patch }
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
    action: "delete" | "duplicate" | "link"
  ) => {
    if (action === "delete") {
      deleteSelected();
      return;
    }

    if (action === "duplicate") {
      duplicateSelected();
      return;
    }

    copySelectedLink();
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
    setStyle((previousStyle) =>
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

  const activateTool = (nextTool: Tool) => {
    if (nextTool === "image") {
      imageInputRef.current?.click();
      return;
    }

    setTool(nextTool);
  };

  const readImageFile = (file: File) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPendingImageSrc(reader.result);
        setTool("image");
      }
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
  };

  const onCanvasContextMenu = (event: ReactMouseEvent<SVGSVGElement>) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY
    });
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
      readClipboardImage(imageFile);
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

  const { interaction, onPointerDown, onPointerMove, onPointerUp } =
    useToolPointerHandlers({
      canvasState,
      canvasStateRef,
      closeContextMenu,
      commitState,
      createElementName: (type, elements) =>
        buildElementName(type, elements, naming),
      getToolForSelectedElement,
      pan,
      pendingImageSrc,
      replaceActiveState,
      selectedElements,
      setEditingTextElementId,
      setPan,
      setPendingImageSrc,
      setTool,
      style,
      svgRef,
      tool,
      zoom
    });

  const canvasCursor = getCanvasCursor({
    isPanning: interaction?.type === "pan",
    tool
  });
  return (
    <section
      className={`${boardClassName} ${boardThemeClassName(theme)}`}
      aria-label={boardAriaLabel}
      style={{ "--kizkatt-ui-scale": uiScale } as CSSProperties}
      tabIndex={CANVAS_TAB_INDEX}
      onKeyDownCapture={onBoardKeyDown}
      onPaste={onBoardPaste}
      onPointerDownCapture={onBoardPointerDownCapture}
    >
      <Toolbar activeTool={tool} onActivateTool={activateTool} />

      <input
        ref={imageInputRef}
        className={fileInputClassName}
        type="file"
        accept={IMAGE_FILE_ACCEPT}
        aria-label={imageInputAriaLabel}
        onChange={onImageFileChange}
      />

      <CanvasContextMenu
        arrowBinding={arrowBinding}
        canGroup={canGroup}
        canUngroup={canUngroup}
        contextMenu={contextMenu}
        onCloseAndRun={runContextMenuAction}
        onCopyPng={copyPngToClipboard}
        onCopySvg={copySvgToClipboard}
        onGroup={groupSelected}
        onPaste={pasteSelected}
        onSelectAll={selectAll}
        onUngroup={ungroupSelected}
        setArrowBinding={setArrowBinding}
        setShowGrid={setShowGrid}
        setSnapToMidpoints={setSnapToMidpoints}
        setSnapToObjects={setSnapToObjects}
        setViewMode={setViewMode}
        setZenMode={setZenMode}
        showGrid={showGrid}
        snapToMidpoints={snapToMidpoints}
        snapToObjects={snapToObjects}
        viewMode={viewMode}
        zenMode={zenMode}
      />

      <MainMenu
        canvasBackgroundColor={canvasBackgroundColor}
        customCanvasBackgroundColor={customCanvasBackgroundColor}
        gridColor={gridColor}
        menuOpen={menuOpen}
        onExport={quickSaveCanvas}
        onOpen={quickLoadCanvas}
        onCanvasBackgroundChange={setStoredCanvasBackground}
        onGridColorChange={setStoredGridColor}
        onMenuOpenChange={setMenuOpen}
        onPickCanvasBackground={() => void pickCanvasBackground()}
        onResetCanvas={resetCanvas}
        onThemeChange={setStoredTheme}
        onUiScaleChange={setStoredUiScale}
        theme={theme}
        uiScale={uiScale}
      />
      {showStylePanel && (
        <StylePanel
          activeTool={tool}
          canToggleClosedPath={Boolean(closeablePathElement)}
          closedPath={Boolean(closeablePathElement?.closed)}
          style={panelStyle}
          selectedElements={selectedElements}
          theme={theme}
          onClosedPathChange={updateClosedPath}
          onStyleChange={updateSelectedStyle}
          onAction={applyElementAction}
          onLayerAction={applyLayerAction}
        />
      )}
      {editingTextElement && (
        <TextEditor
          element={editingTextElement}
          onBlur={() => setEditingTextElementId(null)}
          onChange={(text) => updateTextElement(editingTextElement.id, text)}
          pan={pan}
          zoom={zoom}
        />
      )}

      <svg
        ref={svgRef}
        className={canvasClassName}
        role="application"
        aria-label={canvasAriaLabel}
        style={
          {
            "--kizkatt-canvas-grid": gridColor,
            backgroundColor: canvasBackgroundColor,
            cursor: canvasCursor
          } as CSSProperties
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onContextMenu={onCanvasContextMenu}
      >
        <CanvasGrid pan={pan} visible={showGrid} zoom={zoom} />
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
          {canvasState.elements.map((element) => {
            const isSelected = canvasState.selectedIds.includes(element.id);
            const showElementSelection =
              selectedElements.length <= 1 && isSelected;
            const isDrawingFreehand =
              interaction?.type === "create" &&
              interaction.elementId === element.id &&
              element.type === "draw";
            const isCreatingLinearElement =
              interaction?.type === "create" &&
              interaction.elementId === element.id &&
              (element.type === "line" || element.type === "arrow");
            const isCreatingElement =
              interaction?.type === "create" &&
              interaction.elementId === element.id;
            const isRotatingSelection = interaction?.type === "rotate";

            return renderElement(
              element,
              showElementSelection && !isDrawingFreehand,
              {
                selectedBendIndex:
                  canvasState.selectedBend?.elementId === element.id
                    ? canvasState.selectedBend.bendIndex
                    : undefined,
                showLinearBendHandles: !isCreatingLinearElement,
                showRotateHandle: !isCreatingElement,
                showSelectionBounds: !isRotatingSelection
              }
            );
          })}
          <SelectionArea interaction={interaction} />
          <SelectedBounds elements={selectedElements} interaction={interaction} />
        </g>
      </svg>

      <FooterControls
        canRedo={canRedo}
        canUndo={canUndo}
        zoom={zoom}
        onRedo={redo}
        onUndo={undo}
        onZoomIn={() =>
          setZoom((value) => Math.min(MAX_ZOOM, value + ZOOM_STEP))
        }
        onZoomOut={() =>
          setZoom((value) => Math.max(MIN_ZOOM, value - ZOOM_STEP))
        }
      />    </section>
  );
}
