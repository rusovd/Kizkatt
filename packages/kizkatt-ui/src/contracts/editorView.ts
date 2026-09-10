import type {
  MouseEvent,
  PointerEvent,
  RefObject
} from "react";

import type {
  Bounds,
  ContextMenuState,
  Dpi,
  GridSettings,
  Interaction,
  KizkattElement,
  KizkattTheme,
  ObjectDimensionAxis,
  ObjectGeometryPatch,
  ObjectMirrorAxis,
  ObjectPanelGeometry,
  Point,
  SelectionAreaMode,
  SelectionTransformMode,
  StyleState,
  Tool
} from "kizkatt-graphic-engine";
export type {
  ObjectDimensionAxis,
  ObjectGeometryPatch,
  ObjectMirrorAxis,
  ObjectPanelGeometry
} from "kizkatt-graphic-engine";
import type {
  EditorDisplayMode,
  ElementInfoOverlayItem
} from "../model/types";

export type { EditorDisplayMode } from "../model/types";

export type KizkattRenderElementOptions = {
  linearEndpointMode?: "node" | "resize";
  overlayVariant?: "primary" | "internal";
  selectedBendIndex?: number;
  selectionTransformCenter?: Point | null;
  selectionTransformMode?: SelectionTransformMode;
  showLinearBendHandles?: boolean;
  showRotateHoverIcon?: boolean;
  showRotateHandle?: boolean;
  showSelectionBounds?: boolean;
  wireframe?: boolean;
};

export type ToolControls = {
  activeTool: Tool;
  onActivateTool: (tool: Tool) => void;
};

export type EditorCommandControls = {
  arrowBinding: boolean;
  canBreakApart: boolean;
  canCopySelection: boolean;
  canGroup: boolean;
  canRevertObjectBase: boolean;
  canUngroup: boolean;
  canUpdateObjectBase: boolean;
  contextMenu: ContextMenuState | null;
  onCloseAndRun: (action: () => void | Promise<void>) => void;
  onBreakApart: () => void;
  onCopy: () => void;
  onCopyPng: () => Promise<void>;
  onCopySvg: () => Promise<void>;
  onGroup: () => void;
  onPaste: () => void | Promise<void>;
  onPasteSvgCode: () => void | Promise<void>;
  onRefreshPage: () => void;
  onRevertObjectBase: () => void;
  onSelectAll: () => void;
  onUpdateObjectBase: () => void;
  onUngroup: () => void;
  selectionAreaMode: SelectionAreaMode;
  setArrowBinding: (updater: (value: boolean) => boolean) => void;
  setSelectionAreaMode: (mode: SelectionAreaMode) => void;
  setSnapToMidpoints: (updater: (value: boolean) => boolean) => void;
  setSnapToObjects: (updater: (value: boolean) => boolean) => void;
  snapToMidpoints: boolean;
  snapToObjects: boolean;
};

export type DocumentControls = {
  activeDisplayMode: EditorDisplayMode | null;
  canvasBackgroundColor: string;
  customCanvasBackgroundColor: string;
  lastDisplayMode: EditorDisplayMode;
  menuOpen: boolean;
  onCanvasBackgroundChange: (color: string) => void;
  onExport: () => void;
  onOpen: () => void;
  onPickCanvasBackground: () => void;
  onMenuOpenChange: (open: boolean) => void;
  onResetCanvas: () => void;
  onThemeChange: (theme: KizkattTheme) => void;
  onToggleLastDisplayMode: () => void;
  theme: KizkattTheme;
};

export type ObjectPanelProps = {
  geometry: ObjectPanelGeometry | null;
  gridSettings: GridSettings;
  onAction: (action: "delete" | "duplicate") => void;
  onDimensionChange: (
    axis: ObjectDimensionAxis,
    value: number,
    options: {
      preserveAspectRatio: boolean;
      transient?: boolean;
    }
  ) => void;
  onGeometryChange: (
    patch: ObjectGeometryPatch,
    options?: { transient?: boolean }
  ) => void;
  onGeometryChangeEnd: () => void;
  onMirror: (axis: ObjectMirrorAxis) => void;
  onLayerAction: (action: "back" | "backward" | "forward" | "front") => void;
  onStyleChange: (
    patch: Partial<StyleState>,
    options?: { transient?: boolean }
  ) => void;
  onStyleChangeEnd: () => void;
  selectedElements: KizkattElement[];
  style: StyleState;
  theme: KizkattTheme;
};

export type StylingPanelProps = {
  activeTool: Tool;
  canToggleClosedPath: boolean;
  closedPath: boolean;
  onClosedPathChange: (closed: boolean) => void;
  onStyleChange: (
    patch: Partial<StyleState>,
    options?: { transient?: boolean }
  ) => void;
  onStyleChangeEnd: () => void;
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

export type WorkspaceControls = {
  activeDisplayMode: EditorDisplayMode | null;
  canUseGrid: boolean;
  canRedo: boolean;
  canUndo: boolean;
  dpi: Dpi;
  gridColor: string;
  gridSettings: GridSettings;
  infoMode: boolean;
  onRedo: () => void;
  onGridColorChange: (color: string) => void;
  onGridSettingsChange: (settings: GridSettings) => void;
  onDpiChange: (dpi: Dpi) => void;
  onToggleGrid: () => void;
  onToggleSnapToGrid: () => void;
  onToggleDisplayMode: (mode: EditorDisplayMode) => void;
  onToggleInfoMode: () => void;
  onUndo: () => void;
  onUiScaleChange: (scale: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  showGrid: boolean;
  snapToGrid: boolean;
  theme: KizkattTheme;
  uiScale: number;
  zoom: number;
};

export type KizkattElementSelectionRenderState = {
  options: KizkattRenderElementOptions;
  showInternalOverlay: boolean;
  showPrimaryOverlay: boolean;
};

export type KizkattPreviewTransformInteraction = Extract<
  Interaction,
  { originalElements: KizkattElement[] }
>;

export type KizkattGraphicEditorCanvasViewModel = {
  activeDisplayMode: EditorDisplayMode | null;
  arrowMarkerId: string;
  canvasAriaLabel: string;
  canvasBackgroundColor: string;
  canvasClassName: string;
  canvasCursor: string;
  canvasState: { elements: KizkattElement[] };
  displayElements: KizkattElement[];
  getElementSelectionRenderState: (
    element: KizkattElement
  ) => KizkattElementSelectionRenderState;
  gridColor: string;
  gridSettings: GridSettings;
  imagePlacementBounds: Bounds | null;
  infoMode: boolean;
  infoOverlayItems: ElementInfoOverlayItem[];
  interaction: Interaction | null;
  onContextMenu: (event: MouseEvent<SVGSVGElement>) => void;
  onDoubleClick: (event: MouseEvent<SVGSVGElement>) => void;
  onPointerDown: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerLeave: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerUp: (event: PointerEvent<SVGSVGElement>) => void;
  pan: Point;
  previewTransformInteraction: KizkattPreviewTransformInteraction | null;
  selectedElements: KizkattElement[];
  selectionTransformCenter: Point | null;
  selectionTransformMode: SelectionTransformMode;
  showGrid: boolean;
  showRotateHandle: boolean;
  svgRef: RefObject<SVGSVGElement | null>;
  zoom: number;
};
