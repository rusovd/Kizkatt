import type { KizkattElement, Point } from "../model/types";

const POINT_EQUALITY_EPSILON = 0.000001;

function pointsEqual(first: Point, second: Point) {
  return (
    Math.abs(first.x - second.x) <= POINT_EQUALITY_EPSILON &&
    Math.abs(first.y - second.y) <= POINT_EQUALITY_EPSILON
  );
}

export function appendPolylinePoint(points: Point[], point: Point) {
  const previousPoint = points.at(-1);

  return previousPoint && pointsEqual(previousPoint, point)
    ? points
    : [...points, point];
}

export function updatePolylineElement(
  element: KizkattElement,
  fixedPoints: Point[],
  currentPoint: Point
) {
  const points = appendPolylinePoint(fixedPoints, currentPoint);
  const start = points[0] ?? currentPoint;
  const end = points.at(-1) ?? currentPoint;

  return {
    ...element,
    bends: points.slice(1, -1).map((point) => ({
      x: point.x - start.x,
      y: point.y - start.y
    })),
    curve: undefined,
    height: end.y - start.y,
    width: end.x - start.x,
    x: start.x,
    y: start.y
  };
}
