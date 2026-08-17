import type { Dispatch, PointerEvent, RefObject, SetStateAction } from "react";

import type {
  CanvasState,
  ElementType,
  Interaction,
  KizkattElement,
  Point,
  SelectionAreaMode,
  SelectionTransformMode,
  StyleState,
  Tool
} from "kizkatt-graphic-engine";

export type UseToolPointerHandlersArgs = {
  canvasState: CanvasState;
  canvasStateRef: RefObject<CanvasState>;
  closeContextMenu: () => void;
  commitState: (
    nextState: CanvasState,
    options?: { baseState?: CanvasState; replace?: boolean }
  ) => void;
  createElementName: (
    type: ElementType,
    elements: readonly KizkattElement[]
  ) => string;
  getToolForSelectedElement?: (element: KizkattElement) => Tool | null;
  pan: Point;
  pendingImageSize: { height: number; width: number } | null;
  pendingImageSrc: string | null;
  replaceActiveState: (nextState: CanvasState) => void;
  selectionAreaMode: SelectionAreaMode;
  selectionTransformCenter: Point | null;
  selectionTransformMode: SelectionTransformMode;
  selectedElements: KizkattElement[];
  setEditingTextElementId: Dispatch<SetStateAction<string | null>>;
  setPan: Dispatch<SetStateAction<Point>>;
  setPendingImageSize: Dispatch<
    SetStateAction<{ height: number; width: number } | null>
  >;
  setPendingImageSrc: Dispatch<SetStateAction<string | null>>;
  setSelectionTransformCenter: Dispatch<SetStateAction<Point | null>>;
  setSelectionTransformMode: Dispatch<SetStateAction<SelectionTransformMode>>;
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
