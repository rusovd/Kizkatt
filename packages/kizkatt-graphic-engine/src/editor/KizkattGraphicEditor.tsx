import { useCallback, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type {
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent
} from "react";

import { DEFAULT_ELEMENT_STYLE_BY_THEME } from "../config/constants";
import { CanvasContextMenu } from "../ui/menus/CanvasContextMenu";
import {
  CanvasGrid,
  getCanvasCursor,
  SelectedBounds,
  SelectionArea,
  renderElement,
  serializeSvg
} from "../ui/canvas";
import { FooterControls } from "../ui/controls/FooterControls";
import { MainMenu } from "../ui/menus/MainMenu";
import { StylePanel } from "../ui/panels/StylePanel";
import { Toolbar } from "../ui/controls/Toolbar";
import { createElement, createId } from "../model/element";
import {
  reorderElementsByLayerAction,
} from "../geometry";
import {
  isAllowedEditingShortcut,
  isEditableKeyboardTarget,
  stopDrawingEngineShortcuts
} from "../platform/keyboard";
import { useCanvasHistory } from "../hooks/useCanvasHistory";
import {
  getStoredTheme,
  getStoredCanvasBackgroundColor,
  getStoredCustomCanvasBackgroundColor,
  getStoredGridColor,
  storeCanvasBackgroundColor,
  storeCustomCanvasBackgroundColor,
  storeGridColor,
  storeTheme
} from "../platform/storage";
import { STYLE_TOOLS } from "../tools/toolRegistry";
import { useToolPointerHandlers } from "../tools/pointer";
import type {
  ContextMenuState,
  KizkattElement,
  Point,
  StyleState,
  KizkattTheme,
  Tool
} from "../model/types";

type EyeDropperConstructor = new () => {
  open: () => Promise<{ sRGBHex: string }>;
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

export {
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_GRID_COLOR
} from "../config/constants";
export {
  findElementAtPoint,
  getElementIdsInSelectionArea,
  getResizeAnchorPoint,
  getResizeCursor,
  reorderElementsByLayerAction,
  resizeElementFromHandle,
  resizeElementsFromSelectionHandle,
  rotateElementsAroundPoint
} from "../geometry";
export { stopDrawingEngineShortcuts } from "../platform/keyboard";
export {
  getStoredCanvasBackgroundColor,
  getStoredCustomCanvasBackgroundColor,
  getStoredGridColor,
  getStoredTheme,
  storeCanvasBackgroundColor,
  storeCustomCanvasBackgroundColor,
  storeGridColor,
  storeTheme
} from "../platform/storage";
export type { ResizeHandle } from "../model/types";

export function KizkattGraphicEditor() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const clipboardRef = useRef<KizkattElement[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<KizkattTheme>(() => getStoredTheme());
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
    () => DEFAULT_ELEMENT_STYLE_BY_THEME[getStoredTheme()]
  );
  const {
    canvasState,
    canRedo,
    canUndo,
    commitState,
    redo,
    replaceActiveState,
    undo
  } = useCanvasHistory({ elements: [], selectedIds: [] });
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
    !menuOpen && (selectedElements.length > 0 || STYLE_TOOLS.has(tool));

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

    const pastedElements = clipboardRef.current.map((element) => ({
      ...element,
      id: createId(),
      x: element.x + 24,
      y: element.y + 24
    }));

    commitState({
      elements: [...canvasState.elements, ...pastedElements],
      selectedIds: pastedElements.map((element) => element.id)
    });
  }, [canvasState.elements, commitState]);

  const duplicateSelected = useCallback(() => {
    if (selectedElements.length === 0) {
      return;
    }

    const duplicatedElements = selectedElements.map((element) => ({
      ...element,
      id: createId(),
      x: element.x + 24,
      y: element.y + 24
    }));

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
      const nextElement: KizkattElement = {
        ...createElement("image", pastePoint, style),
        backgroundColor: "transparent",
        height: 160,
        src,
        width: 240
      };

      commitState({
        elements: [...canvasStateRef.current.elements, nextElement],
        selectedIds: [nextElement.id]
      });
      setPendingImageSrc(null);
      setTool("select");
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

  const setStoredTheme = (nextTheme: KizkattTheme) => {
    const previousTheme = theme;

    setTheme(nextTheme);
    setCanvasBackgroundColor(getStoredCanvasBackgroundColor(nextTheme));
    setCustomCanvasBackgroundColor(
      getStoredCustomCanvasBackgroundColor(nextTheme)
    );
    setGridColor(getStoredGridColor(nextTheme));
    setStyle((previousStyle) =>
      isSameStyle(previousStyle, DEFAULT_ELEMENT_STYLE_BY_THEME[previousTheme])
        ? DEFAULT_ELEMENT_STYLE_BY_THEME[nextTheme]
        : previousStyle
    );
    storeTheme(nextTheme);
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
      className={`kizkatt-board kizkatt-board--${theme}`}
      aria-label="Kizkatt diagram canvas"
      tabIndex={0}
      onKeyDownCapture={onBoardKeyDown}
      onPaste={onBoardPaste}
      onPointerDownCapture={onBoardPointerDownCapture}
    >
      <Toolbar activeTool={tool} onActivateTool={activateTool} />

      <input
        ref={imageInputRef}
        className="kizkatt-file-input"
        type="file"
        accept="image/*"
        aria-label="Choose image"
        onChange={onImageFileChange}
      />

      <CanvasContextMenu
        arrowBinding={arrowBinding}
        contextMenu={contextMenu}
        onCloseAndRun={runContextMenuAction}
        onCopyPng={copyPngToClipboard}
        onCopySvg={copySvgToClipboard}
        onPaste={pasteSelected}
        onSelectAll={selectAll}
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
        onExport={() => void copyPngToClipboard()}
        onOpen={() => {}}
        onCanvasBackgroundChange={setStoredCanvasBackground}
        onGridColorChange={setStoredGridColor}
        onMenuOpenChange={setMenuOpen}
        onPickCanvasBackground={() => void pickCanvasBackground()}
        onResetCanvas={resetCanvas}
        onThemeChange={setStoredTheme}
        theme={theme}
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
        <textarea
          aria-label="Edit text"
          autoFocus
          className="kizkatt-text-editor"
          onBlur={() => setEditingTextElementId(null)}
          onChange={(event) =>
            updateTextElement(editingTextElement.id, event.target.value)
          }
          style={{
            color: editingTextElement.strokeColor,
            height: Math.max(36, editingTextElement.height * zoom),
            left: pan.x + editingTextElement.x * zoom,
            opacity: editingTextElement.opacity / 100,
            top: pan.y + editingTextElement.y * zoom,
            width: Math.max(128, editingTextElement.width * zoom)
          }}
          value={editingTextElement.text}
        />
      )}

      <svg
        ref={svgRef}
        className="kizkatt-canvas"
        role="application"
        aria-label="Drawing canvas"
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
            id="kizkatt-arrow"
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

            return renderElement(
              element,
              showElementSelection && !isDrawingFreehand,
              {
                showLinearBendHandles: !isCreatingLinearElement,
                showRotateHandle: !isCreatingElement
              }
            );
          })}
          <SelectionArea interaction={interaction} />
          <SelectedBounds elements={selectedElements} />
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
