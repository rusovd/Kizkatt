import type { MouseEvent, PointerEvent, RefObject, WheelEvent } from "react";

import type {
  Bounds,
  ContextMenuState,
  Dpi,
  FillStyle,
  GridSettings,
  Interaction,
  KizkattElement,
  KizkattTheme,
  ObjectDimensionAxis,
  ObjectGeometryPatch,
  ObjectMirrorAxis,
  ObjectPanelGeometry,
  Point,
  SceneFileFormat,
  SelectionAreaMode,
  SelectionTransformMode,
  StyleState,
  Tool,
  ViewportZoomAction
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

export type DocumentFileFormat = SceneFileFormat;
export type DocumentFormatDialogAction = "export" | "import" | "saveAs";
export type DocumentFormatSelection = {
  archiveKk: boolean;
  format: DocumentFileFormat;
};
export type SceneReplacementAction = "load" | "new";

export type KizkattRenderElementOptions = {
  canvasBackgroundColor?: string;
  linearEndpointMode?: "node" | "resize";
  overlayVariant?: "primary" | "internal";
  selectedBendIndex?: number;
  selectedNodeIndices?: number[];
  selectedSegmentIndex?: number;
  segmentBendActive?: boolean;
  segmentBendHandlePoint?: Point;
  selectionTransformCenter?: Point | null;
  selectionTransformMode?: SelectionTransformMode;
  showLinearBendHandles?: boolean;
  showLinearBezierHandles?: boolean;
  showLinearNodePreview?: boolean;
  showRotateHoverIcon?: boolean;
  showRotateHandle?: boolean;
  showSelectionBounds?: boolean;
  theme?: KizkattTheme;
  wireframe?: boolean;
  zoom?: number;
};

export type ToolControls = {
  activeTool: Tool;
  onActivateTool: (tool: Tool) => void;
};

export type EditorCommandControls = {
  arrowBinding: boolean;
  canBreakApart: boolean;
  canCombineLines: boolean;
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
  onCombineLines: () => void;
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
  showCombineLines: boolean;
};

export type DocumentControls = {
  activeDisplayMode: EditorDisplayMode | null;
  canExport: boolean;
  formatDialogAction: DocumentFormatDialogAction | null;
  lastDisplayMode: EditorDisplayMode;
  menuOpen: boolean;
  sceneReplacementAction: SceneReplacementAction | null;
  onCancelFormatDialog: () => void;
  onCancelSceneReplacement: () => void;
  onChooseFormat: (selection: DocumentFormatSelection) => void;
  onConfirmSceneReplacementWithoutSaving: () => void;
  onConfirmSaveAndReplaceScene: () => void;
  onExport: () => void;
  onImport: () => void;
  onLoad: () => void;
  onMenuOpenChange: (open: boolean) => void;
  onNew: () => void;
  onPrint: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onThemeChange: (theme: KizkattTheme) => void;
  onToggleLastDisplayMode: () => void;
  theme: KizkattTheme;
};

export type ObjectPanelProps = {
  activeTool: Tool;
  canUseNodeAction?: (action: NodeEditorAction) => boolean;
  canZoomToAll: boolean;
  canZoomToSelected: boolean;
  geometry: ObjectPanelGeometry | null;
  gradientFillPanelOpen?: boolean;
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
  onGradientOpen?: () => void;
  onNodeAction?: (action: NodeEditorAction) => void;
  onLayerAction: (action: "back" | "backward" | "forward" | "front") => void;
  onStyleChange: (
    patch: Partial<StyleState>,
    options?: { transient?: boolean }
  ) => void;
  onStyleChangeEnd: () => void;
  onTextureFillOpen?: () => void;
  onViewportZoomAction: (action: ViewportZoomAction) => void;
  selectedElements: KizkattElement[];
  style: StyleState;
  textureFillPanelOpen?: boolean;
  theme: KizkattTheme;
};

export type NodeEditorAction =
  | "addPointBefore"
  | "deletePoints"
  | "mergePoints"
  | "splitPoint"
  | "segmentToLine"
  | "segmentToCurve";

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
  canvasBackgroundColor: string;
  canUseGrid: boolean;
  canRedo: boolean;
  canUndo: boolean;
  customCanvasBackgroundColor: string;
  dpi: Dpi;
  gridColor: string;
  gridSettings: GridSettings;
  infoMode: boolean;
  onCanvasBackgroundChange: (color: string) => void;
  onRedo: () => void;
  onGridColorChange: (color: string) => void;
  onGridSettingsChange: (settings: GridSettings) => void;
  onDpiChange: (dpi: Dpi) => void;
  onPickCanvasBackground: () => void;
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

export type ContextualFillStyle = Extract<
  FillStyle,
  "gradient" | "monochromeTexture"
>;

export type ContextualFillControlState = {
  element: KizkattElement;
  fillStyle: ContextualFillStyle;
  onActivate: () => void;
};

export type KizkattGraphicEditorCanvasViewModel = {
  activeDisplayMode: EditorDisplayMode | null;
  arrowMarkerId: string;
  canvasAriaLabel: string;
  canvasBackgroundColor: string;
  canvasClassName: string;
  canvasCursor: string;
  canvasState: { elements: KizkattElement[] };
  contextualFillControl: ContextualFillControlState | null;
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
  onWheel: (event: WheelEvent<SVGSVGElement>) => void;
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
