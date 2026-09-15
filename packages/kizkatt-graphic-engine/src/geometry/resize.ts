import {
  DEFAULT_SKEW_ANGLE,
  MIN_ELEMENT_SIZE,
  PERCENT_MAX_VALUE,
  RESIZE_HANDLES,
  SKEW_TRANSFORM_MIN_DENOMINATOR
} from "../config/constants";
import type {
  Bounds,
  KizkattElement,
  Point,
  ResizeHandle,
  SkewHandle
} from "../model/types";
import { getIdSet } from "../model/collections";
import { getElementBounds } from "./bounds";
import { getElementBends } from "./linearElements";
import {
  getElementAxes,
  getElementCenter,
  getElementLocalPoint,
  normalizeDegrees,
  transformElementPoint
} from "./primitives";
import { transformSvgPathData } from "./svgPathData";

type ResizeHandleConfig = {
  id: ResizeHandle;
  sx: -1 | 0 | 1;
  sy: -1 | 0 | 1;
};

export type ResizeOptions = {
  preserveAspectRatio?: boolean;
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

export function getDimensionFromScalePercent(
  baseDimension: number,
  scalePercent: number
) {
  return (
    (Math.max(MIN_ELEMENT_SIZE, Math.abs(baseDimension)) *
      Math.max(0, scalePercent)) /
    PERCENT_MAX_VALUE
  );
}

export function getScalePercentFromDimension(
  baseDimension: number,
  dimension: number
) {
  return (
    (Math.max(0, dimension) * PERCENT_MAX_VALUE) /
    Math.max(MIN_ELEMENT_SIZE, Math.abs(baseDimension))
  );
}

function getResizeHandle(handle: ResizeHandle) {
  return RESIZE_HANDLE_BY_ID[handle] ?? DEFAULT_RESIZE_HANDLE;
}

function getProportionalScale(
  width: number,
  height: number,
  sx: -1 | 0 | 1,
  sy: -1 | 0 | 1,
  dx: number,
  dy: number
) {
  const rawScale =
    sx === 0
      ? (sy * dy) / height
      : sy === 0
      ? (sx * dx) / width
      : (dx * sx * width + dy * sy * height) /
        (width * width + height * height);
  const minimumScale = Math.max(
    MIN_ELEMENT_SIZE / width,
    MIN_ELEMENT_SIZE / height
  );

  return Math.max(minimumScale, rawScale);
}

function getAnchoredBoundsCoordinate(
  anchor: number,
  size: number,
  direction: -1 | 0 | 1
) {
  return direction === 1
    ? anchor
    : direction === -1
    ? anchor - size
    : anchor - size / 2;
}

function getResizeBoundsAnchor(
  bounds: Bounds,
  sx: -1 | 0 | 1,
  sy: -1 | 0 | 1
) {
  return {
    x:
      sx === 0
        ? bounds.x + bounds.width / 2
        : sx === 1
          ? bounds.x
          : bounds.x + bounds.width,
    y:
      sy === 0
        ? bounds.y + bounds.height / 2
        : sy === 1
          ? bounds.y
          : bounds.y + bounds.height
  };
}

function getFixedStrokeLinearResizeInset(element: KizkattElement) {
  return (element.type === "line" || element.type === "arrow") &&
    !element.scaleStrokeWithObject
    ? Math.max(0, element.strokeWidth / 2)
    : 0;
}

function getInsetBounds(bounds: Bounds, inset: number): Bounds {
  if (inset <= 0) {
    return bounds;
  }

  return {
    height: Math.max(MIN_ELEMENT_SIZE, bounds.height - inset * 2),
    width: Math.max(MIN_ELEMENT_SIZE, bounds.width - inset * 2),
    x: bounds.x + inset,
    y: bounds.y + inset
  };
}

function getInsetResizePoint(
  point: Point,
  sx: -1 | 0 | 1,
  sy: -1 | 0 | 1,
  inset: number
) {
  if (inset <= 0) {
    return point;
  }

  return {
    x: point.x - sx * inset,
    y: point.y - sy * inset
  };
}

function scaleAnchoredCoordinate(
  coordinate: number,
  originalSize: number,
  nextSize: number,
  direction: -1 | 0 | 1
) {
  const scale = nextSize / originalSize;

  return direction === 1
    ? coordinate * scale
    : direction === -1
    ? nextSize - (originalSize - coordinate) * scale
    : nextSize / 2 + (coordinate - originalSize / 2) * scale;
}

function scaleLocalPoint(point: Point, scaleX: number, scaleY: number) {
  return {
    x: point.x * scaleX,
    y: point.y * scaleY
  };
}

function scaleElementDimension(value: number, scale: number) {
  const scaledValue = Math.max(MIN_ELEMENT_SIZE, Math.abs(value) * scale);

  return value < 0 ? -scaledValue : scaledValue;
}

function getScaledStrokeWidth(
  element: KizkattElement,
  scaleX: number,
  scaleY: number
) {
  if (!element.scaleStrokeWithObject) {
    return element.strokeWidth;
  }

  const scale = Math.sqrt(Math.abs(scaleX * scaleY));

  return element.strokeWidth * scale;
}

function scalePathData(
  pathData: string | undefined,
  scaleX: number,
  scaleY: number,
  transformPoint: (point: Point) => Point = (point) =>
    scaleLocalPoint(point, scaleX, scaleY)
) {
  if (!pathData) {
    return undefined;
  }

  return transformSvgPathData(pathData, {
    transformArcRadii: (radii) => ({
      rx: radii.rx * Math.abs(scaleX),
      ry: radii.ry * Math.abs(scaleY)
    }),
    transformPoint
  })?.pathData;
}

function getElementCornerPoint(
  element: KizkattElement,
  sx: -1 | 0 | 1,
  sy: -1 | 0 | 1
) {
  const center = getElementCenter(element);
  const { xAxis, yAxis } = getElementAxes(
    element.angle,
    element.flipX,
    element.flipY
  );

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

export function getResizeCursor(
  angle: number,
  handle: ResizeHandle,
  flipX = false,
  flipY = false
) {
  const { sx, sy } = getResizeHandle(handle);
  const localAngle =
    (Math.atan2(sy * (flipY ? -1 : 1), sx * (flipX ? -1 : 1)) * 180) /
    Math.PI;
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
  point: Point,
  options: ResizeOptions = {}
): KizkattElement {
  if (
    (element.type === "line" || element.type === "arrow") &&
    getElementBends(element).length > 0
  ) {
    const { sx, sy } = getResizeHandle(handle);
    const originalBounds = getElementBounds(element);
    const localPoint = getElementLocalPoint(element, point);
    const resizedElement = resizeElementsFromSelectionHandle(
      [element],
      [element.id],
      originalBounds,
      handle,
      localPoint,
      options
    )[0];
    const resizedBounds = getElementBounds(resizedElement);
    const originalAnchor = transformElementPoint(
      element,
      getResizeBoundsAnchor(originalBounds, sx, sy)
    );
    const resizedAnchor = transformElementPoint(
      resizedElement,
      getResizeBoundsAnchor(resizedBounds, sx, sy)
    );

    return {
      ...resizedElement,
      x: resizedElement.x + originalAnchor.x - resizedAnchor.x,
      y: resizedElement.y + originalAnchor.y - resizedAnchor.y
    };
  }

  const { sx, sy } = getResizeHandle(handle);
  const anchor = getResizeAnchorPoint(element, handle);
  const { xAxis, yAxis } = getElementAxes(
    element.angle,
    element.flipX,
    element.flipY
  );
  const dx = point.x - anchor.x;
  const dy = point.y - anchor.y;
  const localDx = dx * xAxis.x + dy * xAxis.y;
  const localDy = dx * yAxis.x + dy * yAxis.y;
  const originalWidth = Math.max(MIN_ELEMENT_SIZE, Math.abs(element.width));
  const originalHeight = Math.max(MIN_ELEMENT_SIZE, Math.abs(element.height));
  const proportionalScale = options.preserveAspectRatio
    ? getProportionalScale(
        originalWidth,
        originalHeight,
        sx,
        sy,
        localDx,
        localDy
      )
    : null;
  const nextWidth =
    proportionalScale === null
      ? sx === 0
        ? element.width
        : Math.max(MIN_ELEMENT_SIZE, sx * localDx)
      : originalWidth * proportionalScale;
  const nextHeight =
    proportionalScale === null
      ? sy === 0
        ? element.height
        : Math.max(MIN_ELEMENT_SIZE, sy * localDy)
      : originalHeight * proportionalScale;
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
  const scaleX = nextWidth / originalWidth;
  const scaleY = nextHeight / originalHeight;
  const scaleElementLocalPoint = (localPoint: Point) => ({
    x: scaleAnchoredCoordinate(
      localPoint.x,
      originalWidth,
      nextWidth,
      sx
    ),
    y: scaleAnchoredCoordinate(
      localPoint.y,
      originalHeight,
      nextHeight,
      sy
    )
  });

  return {
    ...element,
    bends:
      element.bends || element.curve
        ? getElementBends(element).map(scaleElementLocalPoint)
        : undefined,
    curve: undefined,
    height: nextHeight,
    pathData: scalePathData(element.pathData, scaleX, scaleY, scaleElementLocalPoint),
    points: element.points?.map(scaleElementLocalPoint),
    strokeWidth: getScaledStrokeWidth(element, scaleX, scaleY),
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
  point: Point,
  options: ResizeOptions = {}
) {
  const selectedIdSet = getIdSet(selectedIds);
  const selectedElements = elements.filter((element) =>
    selectedIdSet.has(element.id)
  );
  const { sx, sy } = getResizeHandle(handle);
  const singleResizeInset =
    selectedElements.length === 1
      ? getFixedStrokeLinearResizeInset(selectedElements[0])
      : 0;
  const scalableBounds = getInsetBounds(originalBounds, singleResizeInset);
  const scalablePoint = getInsetResizePoint(point, sx, sy, singleResizeInset);
  const anchor = getResizeBoundsAnchor(scalableBounds, sx, sy);
  const originalWidth = Math.max(MIN_ELEMENT_SIZE, scalableBounds.width);
  const originalHeight = Math.max(MIN_ELEMENT_SIZE, scalableBounds.height);
  const proportionalScale = options.preserveAspectRatio
    ? getProportionalScale(
        originalWidth,
        originalHeight,
        sx,
        sy,
        scalablePoint.x - anchor.x,
        scalablePoint.y - anchor.y
      )
    : null;
  const nextWidth =
    proportionalScale === null
      ? sx === 0
        ? scalableBounds.width
        : Math.max(
            MIN_ELEMENT_SIZE,
            sx === 1
              ? scalablePoint.x - anchor.x
              : anchor.x - scalablePoint.x
          )
      : originalWidth * proportionalScale;
  const nextHeight =
    proportionalScale === null
      ? sy === 0
        ? scalableBounds.height
        : Math.max(
            MIN_ELEMENT_SIZE,
            sy === 1
              ? scalablePoint.y - anchor.y
              : anchor.y - scalablePoint.y
          )
      : originalHeight * proportionalScale;
  const nextBounds = {
    height: nextHeight,
    width: nextWidth,
    x: getAnchoredBoundsCoordinate(anchor.x, nextWidth, sx),
    y: getAnchoredBoundsCoordinate(anchor.y, nextHeight, sy)
  };
  const scaleX = nextWidth / originalWidth;
  const scaleY = nextHeight / originalHeight;

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
      height: scaleElementDimension(element.height, scaleY),
      pathData: scalePathData(element.pathData, scaleX, scaleY),
      points: element.points?.map((localPoint) =>
        scaleLocalPoint(localPoint, scaleX, scaleY)
      ),
      strokeWidth: getScaledStrokeWidth(element, scaleX, scaleY),
      width: scaleElementDimension(element.width, scaleX),
      x: nextBounds.x + (element.x - scalableBounds.x) * scaleX,
      y: nextBounds.y + (element.y - scalableBounds.y) * scaleY
    };
  });
}

export function rotateElementsAroundPoint(
  elements: KizkattElement[],
  selectedIds: string[],
  center: Point,
  angleDelta: number
) {
  const selectedIdSet = getIdSet(selectedIds);
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

export function skewElementsFromSelectionHandle(
  elements: KizkattElement[],
  selectedIds: string[],
  originalBounds: Bounds,
  center: Point,
  handle: SkewHandle,
  start: Point,
  point: Point
) {
  const selectedIdSet = getIdSet(selectedIds);
  const width = Math.max(
    SKEW_TRANSFORM_MIN_DENOMINATOR,
    originalBounds.width
  );
  const height = Math.max(
    SKEW_TRANSFORM_MIN_DENOMINATOR,
    originalBounds.height
  );
  const rawSkewDelta =
    handle === "top" || handle === "bottom"
      ? Math.atan((point.x - start.x) / height)
      : Math.atan((point.y - start.y) / width);
  const skewDelta =
    handle === "top" || handle === "left" ? -rawSkewDelta : rawSkewDelta;
  const skewTangent = Math.tan(skewDelta);

  return elements.map((element) => {
    if (!selectedIdSet.has(element.id)) {
      return element;
    }

    const elementCenter = getElementCenter(element);
    const nextCenter =
      handle === "top" || handle === "bottom"
        ? {
            x: elementCenter.x + (elementCenter.y - center.y) * skewTangent,
            y: elementCenter.y
          }
        : {
            x: elementCenter.x,
            y: elementCenter.y + (elementCenter.x - center.x) * skewTangent
          };

    return {
      ...element,
      skewX:
        handle === "top" || handle === "bottom"
          ? (element.skewX ?? DEFAULT_SKEW_ANGLE) + skewDelta
          : element.skewX,
      skewY:
        handle === "left" || handle === "right"
          ? (element.skewY ?? DEFAULT_SKEW_ANGLE) + skewDelta
          : element.skewY,
      x: nextCenter.x - element.width / 2,
      y: nextCenter.y - element.height / 2
    };
  });
}
