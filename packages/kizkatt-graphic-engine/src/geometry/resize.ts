import { MIN_ELEMENT_SIZE, RESIZE_HANDLES } from "../config/constants";
import type {
  Bounds,
  KizkattElement,
  Point,
  ResizeHandle
} from "../model/types";
import { getElementBends } from "./linearElements";
import {
  getElementAxes,
  getElementCenter,
  normalizeDegrees
} from "./primitives";

type ResizeHandleConfig = {
  id: ResizeHandle;
  sx: -1 | 0 | 1;
  sy: -1 | 0 | 1;
};

const DEFAULT_RESIZE_HANDLE = RESIZE_HANDLES[2];
const RESIZE_HANDLE_BY_ID = RESIZE_HANDLES.reduce<
  Record<ResizeHandle, ResizeHandleConfig>
>(
  (map, handle) => {
    map[handle.id] = handle;
    return map;
  },
  {} as Record<ResizeHandle, ResizeHandleConfig>
);
const CURSOR_STOPS = [
  { angle: 0, cursor: "ew-resize" },
  { angle: 45, cursor: "nwse-resize" },
  { angle: 90, cursor: "ns-resize" },
  { angle: 135, cursor: "nesw-resize" },
  { angle: 180, cursor: "ew-resize" }
] as const;

function getResizeHandle(handle: ResizeHandle) {
  return RESIZE_HANDLE_BY_ID[handle] ?? DEFAULT_RESIZE_HANDLE;
}

function scaleLocalPoint(point: Point, scaleX: number, scaleY: number) {
  return {
    x: point.x * scaleX,
    y: point.y * scaleY
  };
}

function getElementCornerPoint(
  element: KizkattElement,
  sx: -1 | 0 | 1,
  sy: -1 | 0 | 1
) {
  const center = getElementCenter(element);
  const { xAxis, yAxis } = getElementAxes(element.angle);

  return {
    x:
      center.x +
      (sx * element.width * xAxis.x) / 2 +
      (sy * element.height * yAxis.x) / 2,
    y:
      center.y +
      (sx * element.width * xAxis.y) / 2 +
      (sy * element.height * yAxis.y) / 2
  };
}

export function getResizeCursor(angle: number, handle: ResizeHandle) {
  const { sx, sy } = getResizeHandle(handle);
  const localAngle = (Math.atan2(sy, sx) * 180) / Math.PI;
  const normalizedAngle = normalizeDegrees(localAngle + (angle * 180) / Math.PI);

  return CURSOR_STOPS.reduce((nearest, current) => {
    const currentDistance = Math.abs(current.angle - normalizedAngle);
    const nearestDistance = Math.abs(nearest.angle - normalizedAngle);

    return currentDistance < nearestDistance ? current : nearest;
  }).cursor;
}

export function getResizeAnchorPoint(
  element: KizkattElement,
  handle: ResizeHandle
) {
  const { sx, sy } = getResizeHandle(handle);

  return getElementCornerPoint(element, -sx as -1 | 0 | 1, -sy as -1 | 0 | 1);
}

export function resizeElementFromHandle(
  element: KizkattElement,
  handle: ResizeHandle,
  point: Point
): KizkattElement {
  const { sx, sy } = getResizeHandle(handle);
  const anchor = getResizeAnchorPoint(element, handle);
  const { xAxis, yAxis } = getElementAxes(element.angle);
  const dx = point.x - anchor.x;
  const dy = point.y - anchor.y;
  const nextWidth =
    sx === 0
      ? element.width
      : Math.max(MIN_ELEMENT_SIZE, sx * (dx * xAxis.x + dy * xAxis.y));
  const nextHeight =
    sy === 0
      ? element.height
      : Math.max(MIN_ELEMENT_SIZE, sy * (dx * yAxis.x + dy * yAxis.y));
  const center = {
    x:
      anchor.x +
      (sx * nextWidth * xAxis.x) / 2 +
      (sy * nextHeight * yAxis.x) / 2,
    y:
      anchor.y +
      (sx * nextWidth * xAxis.y) / 2 +
      (sy * nextHeight * yAxis.y) / 2
  };
  const scaleX = nextWidth / Math.max(MIN_ELEMENT_SIZE, Math.abs(element.width));
  const scaleY = nextHeight / Math.max(MIN_ELEMENT_SIZE, Math.abs(element.height));
  const scaleElementLocalPoint = (localPoint: Point) => ({
    x:
      sx === 0
        ? localPoint.x
        : sx === 1
        ? localPoint.x * scaleX
        : nextWidth - (element.width - localPoint.x) * scaleX,
    y:
      sy === 0
        ? localPoint.y
        : sy === 1
        ? localPoint.y * scaleY
        : nextHeight - (element.height - localPoint.y) * scaleY
  });

  return {
    ...element,
    bends:
      element.bends || element.curve
        ? getElementBends(element).map(scaleElementLocalPoint)
        : undefined,
    curve: undefined,
    height: nextHeight,
    points: element.points?.map(scaleElementLocalPoint),
    width: nextWidth,
    x: center.x - nextWidth / 2,
    y: center.y - nextHeight / 2
  };
}

export function resizeElementsFromSelectionHandle(
  elements: KizkattElement[],
  selectedIds: string[],
  originalBounds: Bounds,
  handle: ResizeHandle,
  point: Point
) {
  const selectedIdSet = new Set(selectedIds);
  const { sx, sy } = getResizeHandle(handle);
  const anchor = {
    x:
      sx === 0
        ? originalBounds.x + originalBounds.width / 2
        : sx === 1
        ? originalBounds.x
        : originalBounds.x + originalBounds.width,
    y:
      sy === 0
        ? originalBounds.y + originalBounds.height / 2
        : sy === 1
        ? originalBounds.y
        : originalBounds.y + originalBounds.height
  };
  const nextWidth =
    sx === 0
      ? originalBounds.width
      : Math.max(
          MIN_ELEMENT_SIZE,
          sx === 1 ? point.x - anchor.x : anchor.x - point.x
        );
  const nextHeight =
    sy === 0
      ? originalBounds.height
      : Math.max(
          MIN_ELEMENT_SIZE,
          sy === 1 ? point.y - anchor.y : anchor.y - point.y
        );
  const nextBounds = {
    height: nextHeight,
    width: nextWidth,
    x:
      sx === 0
        ? originalBounds.x
        : sx === 1
        ? anchor.x
        : anchor.x - nextWidth,
    y:
      sy === 0
        ? originalBounds.y
        : sy === 1
        ? anchor.y
        : anchor.y - nextHeight
  };
  const scaleX = nextWidth / Math.max(MIN_ELEMENT_SIZE, originalBounds.width);
  const scaleY = nextHeight / Math.max(MIN_ELEMENT_SIZE, originalBounds.height);

  return elements.map((element) => {
    if (!selectedIdSet.has(element.id)) {
      return element;
    }

    return {
      ...element,
      bends:
        element.bends || element.curve
          ? getElementBends(element).map((bend) =>
              scaleLocalPoint(bend, scaleX, scaleY)
            )
          : undefined,
      curve: undefined,
      height: Math.max(MIN_ELEMENT_SIZE, element.height * scaleY),
      points: element.points?.map((localPoint) =>
        scaleLocalPoint(localPoint, scaleX, scaleY)
      ),
      width: Math.max(MIN_ELEMENT_SIZE, element.width * scaleX),
      x: nextBounds.x + (element.x - originalBounds.x) * scaleX,
      y: nextBounds.y + (element.y - originalBounds.y) * scaleY
    };
  });
}

export function rotateElementsAroundPoint(
  elements: KizkattElement[],
  selectedIds: string[],
  center: Point,
  angleDelta: number
) {
  const selectedIdSet = new Set(selectedIds);
  const cos = Math.cos(angleDelta);
  const sin = Math.sin(angleDelta);

  return elements.map((element) => {
    if (!selectedIdSet.has(element.id)) {
      return element;
    }

    const elementCenter = getElementCenter(element);
    const dx = elementCenter.x - center.x;
    const dy = elementCenter.y - center.y;
    const nextCenter = {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos
    };

    return {
      ...element,
      angle: element.angle + angleDelta,
      x: nextCenter.x - element.width / 2,
      y: nextCenter.y - element.height / 2
    };
  });
}
