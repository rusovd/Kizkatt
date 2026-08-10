import type { Point, SelectionTransformMode } from "../../model/types";

export type RenderElementOptions = {
  overlayVariant?: "primary" | "internal";
  selectedBendIndex?: number;
  selectionTransformCenter?: Point | null;
  selectionTransformMode?: SelectionTransformMode;
  showLinearBendHandles?: boolean;
  showRotateHoverIcon?: boolean;
  showRotateHandle?: boolean;
  showSelectionBounds?: boolean;
};
