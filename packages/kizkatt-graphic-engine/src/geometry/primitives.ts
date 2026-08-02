import { MIN_ELEMENT_SIZE } from "../config/constants";
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

export function getElementAxes(angle: number) {
  return {
    xAxis: {
      x: Math.cos(angle),
      y: Math.sin(angle)
    },
    yAxis: {
      x: -Math.sin(angle),
      y: Math.cos(angle)
    }
  };
}

export function getElementLocalPoint(element: KizkattElement, point: Point) {
  const center = getElementCenter(element);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const cos = Math.cos(element.angle);
  const sin = Math.sin(element.angle);

  return {
    x: center.x + dx * cos + dy * sin,
    y: center.y - dx * sin + dy * cos
  };
}

export function getElementLocalVector(element: KizkattElement, vector: Point) {
  const cos = Math.cos(element.angle);
  const sin = Math.sin(element.angle);

  return {
    x: vector.x * cos + vector.y * sin,
    y: -vector.x * sin + vector.y * cos
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
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared
    )
  );
  const projected = {
    x: start.x + t * dx,
    y: start.y + t * dy
  };

  return Math.hypot(point.x - projected.x, point.y - projected.y);
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
