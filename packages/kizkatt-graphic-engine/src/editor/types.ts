import type {
  ChangeEvent,
  ClipboardEvent,
  ComponentType,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
  RefObject
} from "react";

import type { SvgSerializeOptions } from "../export/svgExport";
import type { ElementNamingConfig } from "../model/naming";
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
} from "../model/types";

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
  viewMode: boolean;
};

export type DocumentControls = {
  canvasBackgroundColor: string;
  customCanvasBackgroundColor: string;
  menuOpen: boolean;
  onCanvasBackgroundChange: (color: string) => void;
  onExport: () => void;
  onOpen: () => void;
  onPickCanvasBackground: () => void;
  onMenuOpenChange: (open: boolean) => void;
  onResetCanvas: () => void;
  onThemeChange: (theme: KizkattTheme) => void;
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
  canUseGrid: boolean;
  canRedo: boolean;
  canUndo: boolean;
  gridColor: string;
  gridSettings: GridSettings;
  onRedo: () => void;
  onGridColorChange: (color: string) => void;
  onGridSettingsChange: (settings: GridSettings) => void;
  onToggleGrid: () => void;
  onToggleSnapToGrid: () => void;
  onToggleViewMode: () => void;
  onToggleZenMode: () => void;
  onUndo: () => void;
  onUiScaleChange: (scale: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  showGrid: boolean;
  snapToGrid: boolean;
  theme: KizkattTheme;
  uiScale: number;
  viewMode: boolean;
  zenMode: boolean;
  zoom: number;
};

export type KizkattGraphicEditorCanvasComponents = {
  CanvasGrid: ComponentType<{
    gridSettings: GridSettings;
    pan: Point;
    visible: boolean;
    zoom: number;
  }>;
  SelectedBounds: ComponentType<{
    elements: KizkattElement[];
    interaction: Interaction | null;
    selectionTransformCenter?: Point | null;
    selectionTransformMode?: SelectionTransformMode;
    showRotateHandle?: boolean;
    showRotateHoverIcon?: boolean;
  }>;
  SelectionArea: ComponentType<{ interaction: Interaction | null }>;
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
    isLoading: boolean;
    menuOpen: boolean;
    theme: KizkattTheme;
    uiScale: number;
    viewMode: boolean;
    zenMode: boolean;
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
  components: KizkattGraphicEditorCanvasComponents;
  defaultElementStyleByTheme?: Record<KizkattTheme, StyleState>;
  getCanvasCursor: (state: { isPanning: boolean; tool: Tool }) => string;
  renderElement: (
    element: KizkattElement,
    selected: boolean,
    options?: KizkattRenderElementOptions
  ) => ReactNode;
  renderElementOverlay?: (
    element: KizkattElement,
    options?: KizkattRenderElementOptions
  ) => ReactNode;
  serializeSvg: (svg: SVGSVGElement, options?: SvgSerializeOptions) => string;
  naming?: ElementNamingConfig;
  getToolForSelectedElement?: (element: KizkattElement) => Tool | null;
};

export type KizkattGraphicEditorProps = KizkattGraphicEditorControllerProps;
