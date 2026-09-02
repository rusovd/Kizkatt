import {
  getDimensionFromScalePercent,
  MIN_ELEMENT_SIZE,
  PERCENT_MAX_VALUE,
  getScalePercentFromDimension,
  VIEWPORT_CENTER_DIVISOR
} from "kizkatt-graphic-engine";
import {
  getElementCenter,
  selectionBounds
} from "kizkatt-graphic-engine";
import { getObjectBase } from "kizkatt-graphic-engine";
import type { Bounds, KizkattElement, Point } from "kizkatt-graphic-engine";
import type {
  ObjectDimensionAxis,
  ObjectGeometryPatch,
  ObjectMirrorAxis,
  ObjectPanelGeometry
} from "./types";

export const RADIANS_PER_DEGREE = Math.PI / 180;
const DEGREES_PER_RADIAN = 180 / Math.PI;
export const SELECTION_SCALE_HANDLE = "se";
export const DEFAULT_OBJECT_GEOMETRY_PERCENT = PERCENT_MAX_VALUE;
export const MIN_OBJECT_GEOMETRY_PERCENT = 1;
export const MAX_OBJECT_GEOMETRY_PERCENT = 10000;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getObjectDimensionPatch(
  geometry: ObjectPanelGeometry,
  axis: ObjectDimensionAxis,
  dimension: number,
  preserveAspectRatio: boolean
): ObjectGeometryPatch {
  const percentAxis = axis === "width" ? "widthPercent" : "heightPercent";
  const otherPercentAxis =
    axis === "width" ? "heightPercent" : "widthPercent";
  const baseDimension =
    axis === "width"
      ? geometry.baseBounds.width
      : geometry.baseBounds.height;
  const nextPercent = clamp(
    getScalePercentFromDimension(baseDimension, dimension),
    MIN_OBJECT_GEOMETRY_PERCENT,
    MAX_OBJECT_GEOMETRY_PERCENT
  );

  if (!preserveAspectRatio) {
    return { [percentAxis]: nextPercent };
  }

  const currentPercent = geometry[percentAxis];
  const otherPercent = geometry[otherPercentAxis];
  const ratio =
    otherPercent / Math.max(MIN_OBJECT_GEOMETRY_PERCENT, currentPercent);

  return {
    [otherPercentAxis]: nextPercent * ratio,
    [percentAxis]: nextPercent
  };
}

export function getBoundsCenter(bounds: Bounds): Point {
  return {
    x: bounds.x + bounds.width / VIEWPORT_CENTER_DIVISOR,
    y: bounds.y + bounds.height / VIEWPORT_CENTER_DIVISOR
  };
}

export function getElementFromBase(element: KizkattElement): KizkattElement {
  const base = element.base ?? getObjectBase(element);

  return {
    ...element,
    angle: base.angle,
    bends: base.bends?.map((bend) => ({ ...bend })),
    curve: base.curve ? { ...base.curve } : undefined,
    height: base.height,
    pathData: base.pathData,
    points: base.points?.map((point) => ({ ...point })),
    skewX: base.skewX,
    skewY: base.skewY,
    width: base.width,
    x: base.center.x - base.width / VIEWPORT_CENTER_DIVISOR,
    y: base.center.y - base.height / VIEWPORT_CENTER_DIVISOR
  };
}

function getElementAngleDeltaFromBase(element: KizkattElement) {
  const base = element.base ?? getObjectBase(element);

  return (element.angle - base.angle) * DEGREES_PER_RADIAN;
}

export function getObjectPanelGeometry(
  selectedElements: KizkattElement[]
): ObjectPanelGeometry | null {
  const bounds = selectionBounds(selectedElements, { includeRotation: true });
  const baseElements = selectedElements.map(getElementFromBase);
  const baseBounds = selectionBounds(baseElements, { includeRotation: true });

  if (!bounds || !baseBounds) {
    return null;
  }

  const center = getBoundsCenter(bounds);
  const baseCenter = getBoundsCenter(baseBounds);
  const heightPercent =
    (bounds.height / Math.max(MIN_ELEMENT_SIZE, baseBounds.height)) *
    PERCENT_MAX_VALUE;
  const widthPercent =
    (bounds.width / Math.max(MIN_ELEMENT_SIZE, baseBounds.width)) *
    PERCENT_MAX_VALUE;

  return {
    angle: selectedElements[0]
      ? getElementAngleDeltaFromBase(selectedElements[0])
      : 0,
    baseBounds,
    bounds,
    height: getDimensionFromScalePercent(baseBounds.height, heightPercent),
    heightPercent,
    offsetX: center.x - baseCenter.x,
    offsetY: center.y - baseCenter.y,
    width: getDimensionFromScalePercent(baseBounds.width, widthPercent),
    widthPercent
  };
}

export function translateElement(
  element: KizkattElement,
  delta: Point
): KizkattElement {
  return {
    ...element,
    x: element.x + delta.x,
    y: element.y + delta.y
  };
}

export function mirrorElementAroundPoint(
  element: KizkattElement,
  center: Point,
  axis: ObjectMirrorAxis
): KizkattElement {
  const elementCenter = getElementCenter(element);
  const nextCenter =
    axis === "horizontal"
      ? { x: center.x * 2 - elementCenter.x, y: elementCenter.y }
      : { x: elementCenter.x, y: center.y * 2 - elementCenter.y };

  const flipX = axis === "horizontal" ? !element.flipX : element.flipX;
  const flipY = axis === "vertical" ? !element.flipY : element.flipY;

  return {
    ...element,
    angle: -element.angle,
    flipX,
    flipY,
    skewX: -(element.skewX ?? 0),
    skewY: -(element.skewY ?? 0),
    x: nextCenter.x - element.width / VIEWPORT_CENTER_DIVISOR,
    y: nextCenter.y - element.height / VIEWPORT_CENTER_DIVISOR
  };
}
