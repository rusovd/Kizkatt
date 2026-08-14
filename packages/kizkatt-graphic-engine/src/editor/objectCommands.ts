import {
  MIN_ELEMENT_SIZE,
  PERCENT_MAX_VALUE,
  VIEWPORT_CENTER_DIVISOR
} from "../config/constants";
import {
  getElementCenter,
  selectionBounds,
  transformSvgPathData
} from "../geometry";
import { getObjectBase } from "../model/element";
import type { Bounds, KizkattElement, Point } from "../model/types";
import type { ObjectMirrorAxis, ObjectPanelGeometry } from "./types";

export const RADIANS_PER_DEGREE = Math.PI / 180;
const DEGREES_PER_RADIAN = 180 / Math.PI;
export const SELECTION_SCALE_HANDLE = "se";
export const DEFAULT_OBJECT_GEOMETRY_PERCENT = PERCENT_MAX_VALUE;

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
    ...base,
    base: element.base,
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

  return {
    angle: selectedElements[0]
      ? getElementAngleDeltaFromBase(selectedElements[0])
      : 0,
    baseBounds,
    bounds,
    heightPercent:
      (bounds.height / Math.max(MIN_ELEMENT_SIZE, baseBounds.height)) *
      PERCENT_MAX_VALUE,
    offsetX: center.x - baseCenter.x,
    offsetY: center.y - baseCenter.y,
    widthPercent:
      (bounds.width / Math.max(MIN_ELEMENT_SIZE, baseBounds.width)) *
      PERCENT_MAX_VALUE
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

function transformElementLocalPoints(
  element: KizkattElement,
  transformPoint: (point: Point) => Point
) {
  return {
    ...element,
    bends: element.bends?.map(transformPoint),
    curve: element.curve ? transformPoint(element.curve) : undefined,
    pathData: element.pathData
      ? transformSvgPathData(element.pathData, {
          transformPoint
        })?.pathData
      : undefined,
    points: element.points?.map(transformPoint)
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
  const mirroredElement = transformElementLocalPoints(element, (point) =>
    axis === "horizontal"
      ? { x: element.width - point.x, y: point.y }
      : { x: point.x, y: element.height - point.y }
  );

  return {
    ...mirroredElement,
    angle:
      axis === "horizontal"
        ? Math.PI - mirroredElement.angle
        : -mirroredElement.angle,
    skewX:
      axis === "horizontal"
        ? -(mirroredElement.skewX ?? 0)
        : mirroredElement.skewX,
    skewY:
      axis === "vertical"
        ? -(mirroredElement.skewY ?? 0)
        : mirroredElement.skewY,
    x: nextCenter.x - mirroredElement.width / VIEWPORT_CENTER_DIVISOR,
    y: nextCenter.y - mirroredElement.height / VIEWPORT_CENTER_DIVISOR
  };
}

