import { DEFAULT_STROKE_WIDTH } from "./constants";

export const DEFAULT_GRAPHIC_EDITOR_SETTINGS = {
  autohideToolbar: false,
  colorMode: "hex"
} as const;

export const OBJECT_PANEL_UI_SETTINGS = {
  anglePrecision: 1,
  angleStep: 0.1,
  degreeSymbol: "°",
  defaultScalePercent: 100,
  edgeOptions: ["sharp", "round"],
  fullPercentRatio: 1,
  gridMillimeterReference: 1,
  id: "object-panel",
  maxScalePercent: 10000,
  maxStrokeWidth: 400,
  minScalePercent: 1,
  minStrokeWidth: 0,
  millimeterPrecision: 2,
  percentPrecision: 1,
  percentStep: 0.1,
  pixelPrecision: 1,
  positionLabelSuffix: ":",
  positionStep: 0.1,
  strokeStyleOptions: [
    "solid",
    "dashed",
    "stitched",
    "dotted",
    "dashDot",
    "zigzag"
  ],
  strokeWidthPresets: {
    mm: [0.1, 0.2, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5, 10, 20, 30, 40, 50],
    px: [1, 2, 3, 4, 6, 8, 10, 12, 18, 24, 48, 96]
  },
  strokeWidthPresetContour: DEFAULT_STROKE_WIDTH
} as const;

export const OBJECT_PANEL_MIN_SIZE = {
  height: 290,
  width: 172
} as const;

export const STYLING_PANEL_MIN_SIZE = {
  height: 195,
  width: 280
} as const;
