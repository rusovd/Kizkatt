import { DEFAULT_STROKE_WIDTH } from "./constants";

export const DEFAULT_GRAPHIC_EDITOR_SETTINGS = {
  autohideToolbar: false,
  dragEnabled: true,
  toolbarOrientation: "horizontal"
} as const;

export const OBJECT_PANEL_UI_SETTINGS = {
  anglePrecision: 1,
  angleStep: 0.1,
  degreeSymbol: "°",
  edgeOptions: ["sharp", "round"],
  fullPercentRatio: 1,
  gridMillimeterReference: 1,
  id: "object-panel",
  maxScalePercent: 10000,
  maxStrokeWidth: 50,
  minScalePercent: 1,
  minStrokeWidth: 0,
  millimeterPrecision: 2,
  percentPrecision: 1,
  percentStep: 0.1,
  pixelPrecision: 1,
  positionLabelSuffix: ":",
  positionStep: 0.1,
  strokeStyleOptions: ["solid", "dashed", "dotted"],
  strokeWidthPresets: [0.1, 0.2, 0.25, 0.5, 0.75, 1, 1.5, 2],
  strokeWidthPresetContour: DEFAULT_STROKE_WIDTH
} as const;
