export type Tool =
  | "hand"
  | "select"
  | "nodeEdit"
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "arrow"
  | "line"
  | "draw"
  | "text"
  | "image"
  | "eraser";

export type ElementType =
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "arrow"
  | "line"
  | "draw"
  | "text"
  | "image";

export type Point = {
  x: number;
  y: number;
};

export type ResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export type SelectionAreaMode = "intersect" | "contain";

export type GridUnit = "px" | "cm";

export type GridSettings = {
  unit: GridUnit;
  cmScale: number;
  majorSize: number;
  minorSize: number;
  showMajor: boolean;
  showMinor: boolean;
};

export type KizkattElement = {
  id: string;
  groupId?: string;
  groupName?: string;
  name?: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle?: "hachure" | "crossHatch" | "solid";
  fillWeight?: number;
  strokeWidth: number;
  strokeStyle: "solid" | "dashed" | "dotted";
  edgeStyle?: "sharp" | "round";
  sloppiness?: "architect" | "artist" | "cartoonist" | "double";
  sloppinessGap?: number;
  opacity: number;
  text?: string;
  src?: string;
  svgContent?: string;
  svgUseElementStyle?: boolean;
  svgViewBox?: string;
  pathData?: string;
  bends?: Point[];
  closed?: boolean;
  curve?: Point;
  points?: Point[];
};

export type CanvasState = {
  elements: KizkattElement[];
  selectedBend?: {
    bendIndex: number;
    elementId: string;
  };
  selectedIds: string[];
};

export type Interaction =
  | {
      type: "create";
      current: Point;
      hasMoved: boolean;
      elementId: string;
      origin: Point;
      startedAt: number;
    }
  | {
      type: "move";
      start: Point;
      originalElements: KizkattElement[];
    }
  | {
      type: "resize";
      originalBounds: Bounds;
      originalElements: KizkattElement[];
      selectedIds: string[];
      start: Point;
      handle?: ResizeHandle;
    }
  | {
      type: "rotate";
      center: Point;
      currentAngle: number;
      handleRadius: number;
      originalElements: KizkattElement[];
      selectedIds: string[];
      startAngle: number;
    }
  | {
      type: "bend";
      bendIndex: number;
      elementId: string;
      originalBends: Point[];
      originalElement: KizkattElement;
      start: Point;
    }
  | {
      type: "pan";
      start: Point;
      originalPan: Point;
    }
  | {
      type: "selectArea";
      current: Point;
      origin: Point;
    };

export type ContextMenuState = {
  x: number;
  y: number;
};

export type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type StyleState = Pick<
  KizkattElement,
  | "backgroundColor"
  | "edgeStyle"
  | "fillStyle"
  | "fillWeight"
  | "opacity"
  | "sloppiness"
  | "sloppinessGap"
  | "strokeColor"
  | "strokeStyle"
  | "strokeWidth"
>;

export type ColorTarget = "strokeColor" | "backgroundColor";

export type ColorPopoverState = {
  paletteId?: string;
  shadeBaseColor?: string;
  target: ColorTarget;
};

export type KizkattTheme = "dark" | "light";
