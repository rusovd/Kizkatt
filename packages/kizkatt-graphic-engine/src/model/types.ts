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

export type LinearEndpoint = "start" | "end";

export type ResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export type SelectionTransformMode = "resize" | "skew";

export type SkewHandle = "top" | "right" | "bottom" | "left";

export type SelectionAreaMode = "intersect" | "contain";

export type GridUnit = "px" | "mm";

export type ArrowheadStyle =
  | "none"
  | "triangle"
  | "open"
  | "circle"
  | "square";

export type GridSettings = {
  unit: GridUnit;
  metricScale: number;
  majorSize: number;
  minorSize: number;
  showMajor: boolean;
  showMinor: boolean;
};

export type KizkattElement = {
  id: string;
  base?: ObjectBase;
  groupId?: string;
  groupName?: string;
  name?: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  flipX?: boolean;
  flipY?: boolean;
  skewX?: number;
  skewY?: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle?: "hachure" | "crossHatch" | "solid";
  fillWeight?: number;
  strokeWidth: number;
  strokeStyle:
    | "solid"
    | "dashed"
    | "dotted"
    | "dashDot"
    | "stitched"
    | "wavy"
    | "zigzag";
  startArrowhead?: ArrowheadStyle;
  endArrowhead?: ArrowheadStyle;
  arrowheadScale?: number;
  calligraphy?: boolean;
  calligraphyStretch?: number;
  strokeBehindFill?: boolean;
  scaleStrokeWithObject?: boolean;
  edgeStyle?: "sharp" | "round";
  sloppiness?: "architect" | "artist" | "cartoonist" | "double";
  sloppinessGap?: number;
  opacity: number;
  text?: string;
  src?: string;
  imageBorderEnabled?: boolean;
  svgContent?: string;
  svgUseElementStyle?: boolean;
  svgViewBox?: string;
  pathData?: string;
  bends?: Point[];
  closed?: boolean;
  curve?: Point;
  points?: Point[];
};

export type ObjectBase = Omit<
  KizkattElement,
  | "base"
  | "groupId"
  | "groupName"
  | "id"
  | "name"
  | "src"
  | "svgContent"
  | "svgUseElementStyle"
  | "svgViewBox"
  | "x"
  | "y"
> & {
  center: Point;
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
      freehandPoints?: Point[];
      hasMoved: boolean;
      elementId: string;
      origin: Point;
      startedAt: number;
    }
  | {
      type: "imageCreate";
      current: Point;
      hasMoved: boolean;
      origin: Point;
    }
  | {
      type: "move";
      canToggleTransformMode?: boolean;
      current: Point;
      originalTransformCenter?: Point | null;
      selectedIds: string[];
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
      type: "skew";
      center: Point;
      handle: SkewHandle;
      originalBounds: Bounds;
      originalElements: KizkattElement[];
      selectedIds: string[];
      start: Point;
    }
  | {
      type: "moveTransformCenter";
      current: Point;
      originalCenter: Point;
      start: Point;
    }
  | {
      type: "bend";
      bendIndex: number;
      elementId: string;
      originalBends: Point[];
      originalElement: KizkattElement;
      originalElements: KizkattElement[];
      selectedIds: string[];
      start: Point;
    }
  | {
      type: "linearEndpoint";
      elementId: string;
      endpoint: LinearEndpoint;
      mode: "node" | "resize";
      originalElement: KizkattElement;
      originalElements: KizkattElement[];
      selectedIds: string[];
    }
  | {
      type: "pan";
      hasMoved: boolean;
      startedOnEmptyCanvas: boolean;
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
  | "arrowheadScale"
  | "backgroundColor"
  | "calligraphy"
  | "calligraphyStretch"
  | "edgeStyle"
  | "endArrowhead"
  | "fillStyle"
  | "fillWeight"
  | "opacity"
  | "sloppiness"
  | "sloppinessGap"
  | "scaleStrokeWithObject"
  | "startArrowhead"
  | "strokeBehindFill"
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
