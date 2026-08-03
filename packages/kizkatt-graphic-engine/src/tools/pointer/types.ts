import type { Dispatch, PointerEvent, RefObject, SetStateAction } from "react";

import type {
  CanvasState,
  ElementType,
  Interaction,
  KizkattElement,
  Point,
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
  selectedElements: KizkattElement[];
  setEditingTextElementId: Dispatch<SetStateAction<string | null>>;
  setPan: Dispatch<SetStateAction<Point>>;
  setPendingImageSrc: Dispatch<SetStateAction<string | null>>;
  setTool: Dispatch<SetStateAction<Tool>>;
  style: StyleState;
  svgRef: RefObject<SVGSVGElement | null>;
  tool: Tool;
  zoom: number;
};

export type PointerHandlerContext = UseToolPointerHandlersArgs & {
  getPointerWorldPoint: (event: PointerEvent<SVGSVGElement>) => Point;
  updateInteraction: (nextInteraction: Interaction | null) => void;
};
