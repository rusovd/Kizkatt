import type { Point, SelectionTransformMode } from "../../model/types";

export type RenderElementOptions = {
  canvasBackgroundColor?: string;
  linearEndpointMode?: "node" | "resize";
  overlayVariant?: "primary" | "internal";
  selectedBendIndex?: number;
  selectedNodeIndices?: number[];
  selectedSegmentIndex?: number;
  selectionTransformCenter?: Point | null;
  selectionTransformMode?: SelectionTransformMode;
  showLinearBendHandles?: boolean;
  showLinearBezierHandles?: boolean;
  showRotateHoverIcon?: boolean;
  showRotateHandle?: boolean;
  showSelectionBounds?: boolean;
  wireframe?: boolean;
  zoom?: number;
};
