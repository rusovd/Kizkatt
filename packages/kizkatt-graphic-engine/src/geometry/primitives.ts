import { DEFAULT_SKEW_ANGLE, MIN_ELEMENT_SIZE } from "../config/constants";
import type { Bounds, KizkattElement, Point } from "../model/types";

export function getElementCenter(element: KizkattElement) {
  return {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2
  };
}

export function getElementEnd(element: KizkattElement) {
  return {
    x: element.x + element.width,
    y: element.y + element.height
  };
}

export function getBoundsFromPointList(
  points: Point[],
  minimumSize = false
): Bounds | null {
  if (points.length === 0) {
    return null;
  }

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  const width = maxX - minX;
  const height = maxY - minY;

  return {
    height: minimumSize ? Math.max(MIN_ELEMENT_SIZE, height) : height,
    width: minimumSize ? Math.max(MIN_ELEMENT_SIZE, width) : width,
    x: minX,
    y: minY
  };
}

export function getBoundsFromPoints(start: Point, end: Point): Bounds {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);

  return {
    height: Math.abs(end.y - start.y),
    width: Math.abs(end.x - start.x),
    x,
    y
  };
}

export function boundsIntersect(a: Bounds, b: Bounds) {
  return (
    a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y
  );
}

export function getDistance(start: Point, end: Point) {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

export function normalizeDegrees(value: number) {
  return ((value % 180) + 180) % 180;
}

export function getElementAxes(
  angle: number,
  flipX = false,
  flipY = false
) {
  const xDirection = flipX ? -1 : 1;
  const yDirection = flipY ? -1 : 1;

  return {
    xAxis: {
      x: Math.cos(angle) * xDirection,
      y: Math.sin(angle) * xDirection
    },
    yAxis: {
      x: -Math.sin(angle) * yDirection,
      y: Math.cos(angle) * yDirection
    }
  };
}

export function transformElementPoint(
  element: KizkattElement,
  point: Point
) {
  const center = getElementCenter(element);
  const skewX = Math.tan(element.skewX ?? DEFAULT_SKEW_ANGLE);
  const skewY = Math.tan(element.skewY ?? DEFAULT_SKEW_ANGLE);
  const localX = (point.x - center.x) * (element.flipX ? -1 : 1);
  const localY = (point.y - center.y) * (element.flipY ? -1 : 1);
  const skewedY = localY + localX * skewY;
  const skewedX = localX + skewedY * skewX;
  const cos = Math.cos(element.angle);
  const sin = Math.sin(element.angle);

  return {
    x: center.x + skewedX * cos - skewedY * sin,
    y: center.y + skewedX * sin + skewedY * cos
  };
}

export function getElementLocalPoint(element: KizkattElement, point: Point) {
  const center = getElementCenter(element);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const cos = Math.cos(element.angle);
  const sin = Math.sin(element.angle);
  const rotatedX = dx * cos + dy * sin;
  const rotatedY = -dx * sin + dy * cos;
  const skewX = Math.tan(element.skewX ?? DEFAULT_SKEW_ANGLE);
  const skewY = Math.tan(element.skewY ?? DEFAULT_SKEW_ANGLE);
  const localX = rotatedX - rotatedY * skewX;
  const localY = rotatedY - localX * skewY;

  return {
    x: center.x + localX * (element.flipX ? -1 : 1),
    y: center.y + localY * (element.flipY ? -1 : 1)
  };
}

export function getElementLocalVector(element: KizkattElement, vector: Point) {
  const cos = Math.cos(element.angle);
  const sin = Math.sin(element.angle);
  const rotatedX = vector.x * cos + vector.y * sin;
  const rotatedY = -vector.x * sin + vector.y * cos;
  const skewX = Math.tan(element.skewX ?? DEFAULT_SKEW_ANGLE);
  const skewY = Math.tan(element.skewY ?? DEFAULT_SKEW_ANGLE);
  const localX = rotatedX - rotatedY * skewX;

  return {
    x: localX * (element.flipX ? -1 : 1),
    y: (rotatedY - localX * skewY) * (element.flipY ? -1 : 1)
  };
}

export function rotatePointAroundPoint(
  point: Point,
  center: Point,
  angle: number
) {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
}

export function getSegmentMidpoint(start: Point, end: Point) {
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2
  };
}

export function distanceToSegment(point: Point, start: Point, end: Point) {
  return Math.sqrt(distanceSquaredToSegment(point, start, end));
}

export function distanceSquaredToSegment(
  point: Point,
  start: Point,
  end: Point
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    const pointDx = point.x - start.x;
    const pointDy = point.y - start.y;

    return pointDx * pointDx + pointDy * pointDy;
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared
    )
  );
  const projectedX = start.x + t * dx;
  const projectedY = start.y + t * dy;
  const projectedDx = point.x - projectedX;
  const projectedDy = point.y - projectedY;

  return projectedDx * projectedDx + projectedDy * projectedDy;
}

export function isPointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;

  for (
    let index = 0, previousIndex = polygon.length - 1;
    index < polygon.length;
    previousIndex = index, index += 1
  ) {
    const current = polygon[index];
    const previous = polygon[previousIndex];
    const intersects =
      current.y > point.y !== previous.y > point.y &&
      point.x <
        ((previous.x - current.x) * (point.y - current.y)) /
          (previous.y - current.y) +
          current.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}
