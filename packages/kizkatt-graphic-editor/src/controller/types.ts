import type {
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  ReactNode,
  RefObject
} from "react";

import type { SvgSerializeOptions } from "kizkatt-graphic-engine";
import type { ElementNamingConfig } from "kizkatt-graphic-engine";
import type {
  Bounds,
  ContextMenuState,
  GridSettings,
  Interaction,
  KizkattElement,
  KizkattTheme,
  Point,
  SelectionAreaMode,
  SelectionTransformMode,
  StyleState,
  Tool
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

export type ObjectPanelGeometry = {
  angle: number;
  baseBounds: Bounds;
  bounds: Bounds;
  heightPercent: number;
  offsetX: number;
  offsetY: number;
  widthPercent: number;
};

export type ObjectGeometryPatch = Partial<
  Pick<
    ObjectPanelGeometry,
    "angle" | "heightPercent" | "offsetX" | "offsetY" | "widthPercent"
  >
>;

export type ObjectMirrorAxis = "horizontal" | "vertical";

export type ObjectPanelProps = {
  geometry: ObjectPanelGeometry;
  gridSettings: GridSettings;
  onGeometryChange: (
    patch: ObjectGeometryPatch,
    options?: { transient?: boolean }
  ) => void;
  onGeometryChangeEnd: () => void;
  onMirror: (axis: ObjectMirrorAxis) => void;
  onStyleChange: (
    patch: Partial<StyleState>,
    options?: { transient?: boolean }
  ) => void;
  onStyleChangeEnd: () => void;
  selectedElements: KizkattElement[];
  style: StyleState;
  theme: KizkattTheme;
};

export type StylePanelProps = {
  activeTool: Tool;
  canToggleClosedPath: boolean;
  closedPath: boolean;
  onAction: (action: "delete" | "duplicate" | "link") => void;
  onClosedPathChange: (closed: boolean) => void;
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
  gridColor: string;
  gridSettings: GridSettings;
  infoMode: boolean;
  onRedo: () => void;
  onGridColorChange: (color: string) => void;
  onGridSettingsChange: (settings: GridSettings) => void;
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

export type KizkattGraphicEditorViewModel = {
  boardBindings: {
    onKeyDownCapture: (event: KeyboardEvent<HTMLElement>) => void;
    onPaste: (event: ClipboardEvent<HTMLElement>) => void;
    onPointerDownCapture: (event: PointerEvent<HTMLElement>) => void;
  };
  canvas: ReactNode;
  commandControls: EditorCommandControls;
  documentControls: DocumentControls;
  imageInputBindings: {
    accept: string;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    ref: RefObject<HTMLInputElement | null>;
  };
  selectionGeometryControls: ObjectPanelProps | null;
  state: {
    activeDisplayMode: EditorDisplayMode | null;
    isLoading: boolean;
    menuOpen: boolean;
    theme: KizkattTheme;
    uiScale: number;
  };
  styleControls: StylePanelProps;
  textEditing: TextEditorProps | null;
  toolControls: ToolControls;
  workspaceControls: WorkspaceControls;
};

export type KizkattGraphicEditorControllerProps = {
  arrowMarkerId?: string;
  canvasAriaLabel?: string;
  canvasClassName?: string;
  children: (viewModel: KizkattGraphicEditorViewModel) => ReactNode;
  defaultElementStyleByTheme?: Record<KizkattTheme, StyleState>;
  getCanvasCursor: (state: { isPanning: boolean; tool: Tool }) => string;
  renderCanvas: (viewModel: KizkattGraphicEditorCanvasViewModel) => ReactNode;
  serializeSvg: (svg: SVGSVGElement, options?: SvgSerializeOptions) => string;
  naming?: ElementNamingConfig;
  getToolForSelectedElement?: (element: KizkattElement) => Tool | null;
};

export type KizkattGraphicEditorProps = KizkattGraphicEditorControllerProps;
