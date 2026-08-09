import type { Dispatch, PointerEvent, RefObject, SetStateAction } from "react";

import type {
  CanvasState,
  ElementType,
  Interaction,
  KizkattElement,
  Point,
  SelectionAreaMode,
  StyleState,
  Tool
} from "../../model/types";

export type UseToolPointerHandlersArgs = {
  canvasState: CanvasState;
  canvasStateRef: RefObject<CanvasState>;
  closeContextMenu: () => void;
  commitState: (nextState: CanvasState) => void;
  createElementName: (
    type: ElementType,
    elements: readonly KizkattElement[]
  ) => string;
  getToolForSelectedElement?: (element: KizkattElement) => Tool | null;
  pan: Point;
  pendingImageSrc: string | null;
  replaceActiveState: (nextState: CanvasState) => void;
  selectionAreaMode: SelectionAreaMode;
  selectedElements: KizkattElement[];
  setEditingTextElementId: Dispatch<SetStateAction<string | null>>;
  setPan: Dispatch<SetStateAction<Point>>;
  setPendingImageSrc: Dispatch<SetStateAction<string | null>>;
  setTool: Dispatch<SetStateAction<Tool>>;
  gridCellSize: number;
  snapToGrid: boolean;
  snapToMidpoints: boolean;
  snapToObjects: boolean;
  style: StyleState;
  svgRef: RefObject<SVGSVGElement | null>;
  tool: Tool;
  viewMode: boolean;
  zoom: number;
};

export type PointerHandlerContext = UseToolPointerHandlersArgs & {
  getPointerWorldPoint: (event: PointerEvent<SVGSVGElement>) => Point;
  getSnappedPointerWorldPoint: (
    event: PointerEvent<SVGSVGElement>,
    ignoredIds?: Iterable<string>
  ) => Point;
  updateInteraction: (nextInteraction: Interaction | null) => void;
};
