import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import type {
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent
} from "react";

import { DEFAULT_ELEMENT_STYLE_BY_THEME } from "../config/constants";
import { createElement, createId } from "../model/element";
import {
  canGroupSelection,
  canUngroupSelection,
  cloneElementsWithFreshIdsAndGroups,
  expandElementIdsToGroups,
  groupSelectedElements,
  ungroupSelectedElements
} from "../model/groups";
import { reorderElementsByLayerAction } from "../geometry";
import {
  isAllowedEditingShortcut,
  isEditableKeyboardTarget,
  stopDrawingEngineShortcuts
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

const DEFAULT_IMAGE_SIZE = {
  height: 160,
  width: 240
};
const MAX_PASTED_IMAGE_SIZE = {
  height: 360,
  width: 480
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
    height: Math.max(1, Math.round(height * scale)),
    width: Math.max(1, Math.round(width * scale))
  };
}

export type KizkattRenderElementOptions = {
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
  onAction: (action: "delete" | "duplicate" | "link") => void;
  onLayerAction: (action: "back" | "backward" | "forward" | "front") => void;
  onStyleChange: (patch: Partial<StyleState>) => void;
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
  getCanvasCursor: (state: { isPanning: boolean; tool: Tool }) => string;
  renderElement: (
    element: KizkattElement,
    selected: boolean,
    options?: KizkattRenderElementOptions
  ) => ReactNode;
  serializeSvg: (svg: SVGSVGElement) => string;
  shouldShowStylePanel: (state: {
    activeTool: Tool;
    selectedElements: KizkattElement[];
  }) => boolean;
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
  arrowMarkerId = "kizkatt-arrow",
  boardAriaLabel = "Kizkatt diagram canvas",
  boardClassName = "kizkatt-board",
  boardThemeClassName = (theme) => `kizkatt-board--${theme}`,
  canvasAriaLabel = "Drawing canvas",
  canvasClassName = "kizkatt-canvas",
  components,
  defaultElementStyleByTheme = DEFAULT_ELEMENT_STYLE_BY_THEME,
  fileInputClassName = "kizkatt-file-input",
  getCanvasCursor,
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
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [style, setStyle] = useState<StyleState>(
    () => defaultElementStyleByTheme[getStoredTheme()]
  );
  const initialCanvasState = useMemo(
    () => getStoredCanvasState() ?? { elements: [], selectedIds: [] },
    []
  );
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
        edgeStyle: selectedElements[0].edgeStyle ?? "round",
        fillStyle: selectedElements[0].fillStyle ?? "solid",
        fillWeight: selectedElements[0].fillWeight ?? 1,
        opacity: selectedElements[0].opacity,
        sloppiness: selectedElements[0].sloppiness ?? "artist",
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
      selectedIds: canvasState.elements.map((element) => element.id)
    });
  }, [canvasState, replaceActiveState]);

  const copySelected = useCallback(() => {
    clipboardRef.current = selectedElements.map((element) => ({ ...element }));
  }, [selectedElements]);

  const pasteSelected = useCallback(() => {
    if (clipboardRef.current.length === 0) {
      return;
    }

    const pastedElements = cloneElementsWithFreshIdsAndGroups(
      clipboardRef.current,
      createId
    );

    commitState({
      elements: [...canvasState.elements, ...pastedElements],
      selectedIds: pastedElements.map((element) => element.id)
    });
  }, [canvasState.elements, commitState]);

  const duplicateSelected = useCallback(() => {
    if (selectedElements.length === 0) {
      return;
    }

    const duplicatedElements = cloneElementsWithFreshIdsAndGroups(
      selectedElements,
      createId
    );

    commitState({
      elements: [...canvasState.elements, ...duplicatedElements],
      selectedIds: duplicatedElements.map((element) => element.id)
    });
  }, [canvasState.elements, commitState, selectedElements]);

  const getPastePoint = useCallback(() => {
    const canvasRect = svgRef.current?.getBoundingClientRect();
    const clientPoint = canvasRect
      ? {
          x: canvasRect.left + canvasRect.width / 2,
          y: canvasRect.top + canvasRect.height / 2
        }
      : {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2
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
      const nextElement: KizkattElement = {
        ...createElement("text", pastePoint, style),
        height: Math.max(36, lines.length * 28),
        text: trimmedText,
        width: Math.min(520, Math.max(128, longestLineLength * 12))
      };

      commitState({
        elements: [...canvasStateRef.current.elements, nextElement],
        selectedIds: [nextElement.id]
      });
      setEditingTextElementId(null);
      setTool("select");

      return true;
    },
    [commitState, getPastePoint, style]
  );

  const insertPastedImage = useCallback(
    (src: string) => {
      const pastePoint = getPastePoint();
      const baseElement: KizkattElement = {
        ...createElement("image", pastePoint, style),
        backgroundColor: "transparent",
        height: DEFAULT_IMAGE_SIZE.height,
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

      if (image.complete && image.naturalWidth > 0) {
        commitImage(getFittedImageSize(image.naturalWidth, image.naturalHeight));
      }
      window.setTimeout(() => commitImage(), 250);
    },
    [commitState, getPastePoint, style]
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
    if (canvasState.selectedIds.length === 0) {
      return;
    }

    commitState({
      elements: canvasState.elements.filter(
        (element) => !canvasState.selectedIds.includes(element.id)
      ),
      selectedIds: []
    });
    setEditingTextElementId(null);
  }, [canvasState, commitState]);

  const copySelectedLink = useCallback(() => {
    if (canvasState.selectedIds.length === 0 || !navigator.clipboard?.writeText) {
      return;
    }

    void navigator.clipboard.writeText(
      `kizkatt://selection/${canvasState.selectedIds.join(",")}`
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
        createId()
      ),
      selectedIds
    });
  }, [canGroup, canvasState, commitState]);

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
    const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Unable to export canvas image."));
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    const rect = svg.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width || window.innerWidth));
    canvas.height = Math.max(1, Math.round(rect.height || window.innerHeight));
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );

    if (pngBlob) {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": pngBlob })
      ]);
    }
  };

  const updateSelectedStyle = (patch: Partial<StyleState>) => {
    setStyle((previousStyle) => ({ ...previousStyle, ...patch }));

    if (canvasState.selectedIds.length === 0) {
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

  const applyLayerAction = (
    action: "back" | "backward" | "forward" | "front"
  ) => {
    if (canvasState.selectedIds.length === 0) {
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
    commitState({ elements: [], selectedIds: [] });
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
    event.target.value = "";

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

      if (key === "v" && clipboardRef.current.length === 0) {
        return;
      }

      event.preventDefault();

      if (key === "a") {
        selectAll();
      } else if (key === "c") {
        copySelected();
      } else if (key === "v") {
        pasteSelected();
      } else if (key === "z" && event.shiftKey) {
        redo();
      } else if (key === "z") {
        undo();
      } else if (key === "y") {
        redo();
      }

      return;
    }

    if (event.key === "Delete") {
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
      item.type.startsWith("image/")
    );
    const imageFile =
      imageItem?.getAsFile() ??
      Array.from(clipboardData.files).find((file) =>
        file.type.startsWith("image/")
      );

    if (imageFile) {
      event.preventDefault();
      readClipboardImage(imageFile);
      return;
    }

    if (insertPastedText(clipboardData.getData("text/plain"))) {
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
      tabIndex={0}
      onKeyDownCapture={onBoardKeyDown}
      onPaste={onBoardPaste}
      onPointerDownCapture={onBoardPointerDownCapture}
    >
      <Toolbar activeTool={tool} onActivateTool={activateTool} />

      <input
        ref={imageInputRef}
        className={fileInputClassName}
        type="file"
        accept="image/*"
        aria-label="Choose image"
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
          style={panelStyle}
          theme={theme}
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
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" />
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
        onZoomIn={() => setZoom((value) => Math.min(4, value + 0.1))}
        onZoomOut={() => setZoom((value) => Math.max(0.25, value - 0.1))}
      />    </section>
  );
}
