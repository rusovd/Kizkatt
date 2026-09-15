export type Tool =
  | "hand"
  | "zoom"
  | "select"
  | "nodeEdit"
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "arrow"
  | "line"
  | "polyline"
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

export type LinearSegmentControl = {
  cp1?: Point;
  cp2?: Point;
  mode?: "curve" | "line";
};

export type LinearNodeSelection = {
  elementId: string;
  nodeIndices: number[];
  segmentIndex?: number;
};

export type ResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export type SelectionTransformMode = "resize" | "skew";

export type SkewHandle = "top" | "right" | "bottom" | "left";

export type SelectionAreaMode = "intersect" | "contain";

export type GridUnit = "px" | "mm";
export type Dpi = 72 | 96 | 150 | 203 | 300;

export type ArrowheadStyle =
  | "none"
  | "triangle"
  | "open"
  | "circle"
  | "square";

export type BitmapTextureBlendMode = "multiply" | "normal";
export type BitmapTextureOffsetMode = "column" | "row";
export type FillStyle =
  | "monochromeTexture"
  | "gradient"
  | "hachure"
  | "crossHatch"
  | "solid";

export type BitmapTextureFill = {
  blendAmount: number;
  blendMode: BitmapTextureBlendMode;
  brightness: number;
  brightnessEnabled: boolean;
  color: number;
  colorEnabled: boolean;
  desaturate: number;
  desaturateEnabled: boolean;
  destinationOutAmount: number;
  edgeMatch: number;
  edgeMatchEnabled: boolean;
  fitToObject: boolean;
  height: number;
  luminance: number;
  luminanceEnabled: boolean;
  mirrorX: boolean;
  mirrorY: boolean;
  multiplyAmount: number;
  name: string;
  offset: number;
  offsetMode: BitmapTextureOffsetMode;
  offsetX: number;
  offsetY: number;
  rotation: number;
  scaleLocked: boolean;
  skew: number;
  skewY: number;
  source?: string;
  textureId: string;
  tile: boolean;
  transformWithObject: boolean;
  transparencyColor: string;
  transparencyEnabled: boolean;
  transparencyTolerance: number;
  width: number;
};

export type GradientType = "linear" | "radial" | "conic" | "diamond";
export type GradientSpread = "pad" | "repeat" | "reflect";

export type GradientStop = {
  id: string;
  color: string;
  opacity: number;
  position: number;
};

export type GradientFill = {
  acceleration: number;
  centerX: number;
  centerY: number;
  name: string;
  presetId?: string;
  rotation: number;
  scaleLocked: boolean;
  scaleX: number;
  scaleY: number;
  skew: number;
  smooth: boolean;
  spread: GradientSpread;
  steps: number;
  stepsEnabled: boolean;
  stops: GradientStop[];
  type: GradientType;
};

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
  lineCombinationId?: string;
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
  bitmapTexture?: BitmapTextureFill;
  gradientFill?: GradientFill;
  fillStyle?: FillStyle;
  fillWeight?: number;
  strokeWidth: number;
  strokeLineCount?: number;
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
  linearSegmentControls?: LinearSegmentControl[];
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
  | "lineCombinationId"
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
  selectedNodes?: {
    elementId: string;
    lineSelections?: LinearNodeSelection[];
    nodeIndices: number[];
    segmentIndex?: number;
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
      type: "polylineCreate";
      current: Point;
      elementId: string;
      fixedPoints: Point[];
      hasMoved: boolean;
      pointerDownOrigin: Point | null;
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
      type: "linearNodes";
      elementId: string;
      originalBends: Point[];
      originalElement: KizkattElement;
      originalElements: KizkattElement[];
      selectedIds: string[];
      selectedNodeIndices: number[];
      segmentIndex?: number;
      start: Point;
    }
  | {
      type: "linearSegmentBend";
      elementId: string;
      hasMoved: boolean;
      handlePoint: Point;
      originalElement: KizkattElement;
      originalElements: KizkattElement[];
      selectedIds: string[];
      segmentIndex: number;
      start: Point;
    }
  | {
      type: "bezierControl";
      control: "cp1" | "cp2";
      elementId: string;
      originalElement: KizkattElement;
      originalElements: KizkattElement[];
      selectedIds: string[];
      segmentIndex: number;
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
      selectedIds: string[];
    }
  | {
      type: "zoomArea";
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
  | "bitmapTexture"
  | "calligraphy"
  | "calligraphyStretch"
  | "edgeStyle"
  | "endArrowhead"
  | "fillStyle"
  | "fillWeight"
  | "gradientFill"
  | "opacity"
  | "sloppiness"
  | "sloppinessGap"
  | "scaleStrokeWithObject"
  | "startArrowhead"
  | "strokeBehindFill"
  | "strokeColor"
  | "strokeLineCount"
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
