import { MIN_ELEMENT_SIZE, TRANSPARENT_COLOR } from "../config/constants";
import type { KizkattElement, Point } from "../model/types";
import { getElementBounds } from "./bounds";
import { getLinearElementPoints } from "./linearElements";
import {
  distanceToSegment,
  getElementCenter,
  getElementLocalPoint,
  isPointInPolygon
} from "./primitives";

function getElementHit(element: KizkattElement, point: Point) {
  const localPoint =
    element.angle === 0 ? point : getElementLocalPoint(element, point);
  const tolerance = Math.max(8, element.strokeWidth + 6);
  const bounds = getElementBounds(element);
  const withinBounds =
    localPoint.x >= bounds.x - tolerance &&
    localPoint.x <= bounds.x + bounds.width + tolerance &&
    localPoint.y >= bounds.y - tolerance &&
    localPoint.y <= bounds.y + bounds.height + tolerance;

  if (!withinBounds) {
    return { fill: false, stroke: false };
  }

  if (element.type === "draw") {
    const points = element.points ?? [];
    const fill =
      Boolean(element.pathData && element.closed) &&
      element.backgroundColor !== TRANSPARENT_COLOR &&
      localPoint.x >= bounds.x &&
      localPoint.x <= bounds.x + bounds.width &&
      localPoint.y >= bounds.y &&
      localPoint.y <= bounds.y + bounds.height;
    const stroke = points.some((pointInPath, index) => {
      if (index === 0) {
        return false;
      }

      const previous = points[index - 1];

      return (
        distanceToSegment(
          localPoint,
          { x: element.x + previous.x, y: element.y + previous.y },
          { x: element.x + pointInPath.x, y: element.y + pointInPath.y }
        ) <= tolerance
      );
    });

    return { fill, stroke };
  }

  if (element.type === "line" || element.type === "arrow") {
    const points = getLinearElementPoints(element);
    const stroke = points.some((pointInPath, index) => {
      if (index === 0) {
        return false;
      }

      return distanceToSegment(localPoint, points[index - 1], pointInPath) <= tolerance;
    });

    return { fill: false, stroke };
  }

  if (element.type === "ellipse") {
    const center = getElementCenter(element);
    const rx = Math.max(MIN_ELEMENT_SIZE / 2, Math.abs(element.width / 2));
    const ry = Math.max(MIN_ELEMENT_SIZE / 2, Math.abs(element.height / 2));
    const normalizedDistance = Math.sqrt(
      ((localPoint.x - center.x) / rx) ** 2 +
        ((localPoint.y - center.y) / ry) ** 2
    );

    return {
      fill: normalizedDistance <= 1,
      stroke: Math.abs(normalizedDistance - 1) <= tolerance / Math.max(rx, ry)
    };
  }

  if (element.type === "diamond") {
    const center = getElementCenter(element);
    const polygon = [
      { x: center.x, y: element.y },
      { x: element.x + element.width, y: center.y },
      { x: center.x, y: element.y + element.height },
      { x: element.x, y: center.y }
    ];
    const stroke = polygon.some((corner, index) =>
      distanceToSegment(
        localPoint,
        corner,
        polygon[(index + 1) % polygon.length]
      ) <= tolerance
    );

    return {
      fill: isPointInPolygon(localPoint, polygon),
      stroke
    };
  }

  const left = element.x;
  const right = element.x + element.width;
  const top = element.y;
  const bottom = element.y + element.height;
  const fill =
    localPoint.x >= left &&
    localPoint.x <= right &&
    localPoint.y >= top &&
    localPoint.y <= bottom;
  const stroke =
    fill &&
    Math.min(
      Math.abs(localPoint.x - left),
      Math.abs(localPoint.x - right),
      Math.abs(localPoint.y - top),
      Math.abs(localPoint.y - bottom)
    ) <= tolerance;

  return { fill, stroke };
}

export function findElementAtPoint(elements: KizkattElement[], point: Point) {
  let firstFillHit: KizkattElement | undefined;

  for (let index = elements.length - 1; index >= 0; index -= 1) {
    const element = elements[index];
    const hit = getElementHit(element, point);

    if (hit.stroke) {
      return element;
    }

    if (!firstFillHit && hit.fill) {
      firstFillHit = element;
    }
  }

  return firstFillHit;
}
