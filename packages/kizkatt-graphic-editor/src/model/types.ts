export type {
  Bounds,
  CanvasState,
  ColorPopoverState,
  ColorTarget,
  ContextMenuState,
  ElementType,
  GridSettings,
  GridUnit,
  Interaction,
  KizkattElement,
  KizkattTheme,
  Point,
  ResizeHandle,
  SelectionAreaMode,
  SelectionTransformMode,
  SkewHandle,
  StyleState,
  Tool
} from "kizkatt-graphic-engine";

export type EditorDisplayMode = "preview" | "wireframe";

export type ElementInfoOverlayItem = {
  element: import("kizkatt-graphic-engine").KizkattElement;
  layerNumber: number;
};
