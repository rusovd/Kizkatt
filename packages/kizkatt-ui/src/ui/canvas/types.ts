import type {
  KizkattTheme,
  Point,
  SelectionTransformMode
} from "../../model/types";

export type RenderElementOptions = {
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
