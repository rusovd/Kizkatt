import { MIN_ELEMENT_SIZE, TRANSPARENT_COLOR } from "../config/constants";
import type { KizkattElement, Point } from "../model/types";
import { getElementBounds } from "./bounds";
import { getLinearElementSamplePoints } from "./linearElements";
import {
  distanceSquaredToSegment,
  getElementCenter,
  getElementLocalPoint,
  isPointInPolygon
} from "./primitives";
import { getHitTestCandidateIndices } from "./spatialIndex";

export type HitTestProfileSample = {
  candidateCount: number;
  durationMs: number;
  elementCount: number;
  hitElementId?: string;
  point: Point;
};

export type HitTestObserver = (sample: HitTestProfileSample) => void;

const hitTestObservers = new Set<HitTestObserver>();

export function observeHitTesting(observer: HitTestObserver) {
  hitTestObservers.add(observer);

  return () => {
    hitTestObservers.delete(observer);
  };
}

function getProfileTimestamp() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function reportHitTest(
  elements: KizkattElement[],
  point: Point,
  startedAt: number,
  hitElement: KizkattElement | undefined,
  candidateCount: number
) {
  const sample: HitTestProfileSample = {
    candidateCount,
    durationMs: getProfileTimestamp() - startedAt,
    elementCount: elements.length,
    hitElementId: hitElement?.id,
    point: { ...point }
  };

  hitTestObservers.forEach((observer) => {
    try {
      observer(sample);
    } catch {
      
    }
  });
}

function getElementHit(element: KizkattElement, point: Point) {
  const localPoint =
    element.angle === 0 &&
    (element.skewX ?? 0) === 0 &&
    (element.skewY ?? 0) === 0 &&
    !element.flipX &&
    !element.flipY
      ? point
      : getElementLocalPoint(element, point);
  const tolerance = Math.max(8, element.strokeWidth + 6);
  const toleranceSquared = tolerance * tolerance;
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
        distanceSquaredToSegment(
          localPoint,
          { x: element.x + previous.x, y: element.y + previous.y },
          { x: element.x + pointInPath.x, y: element.y + pointInPath.y }
        ) <= toleranceSquared
      );
    });

    return { fill, stroke };
  }

  if (element.type === "line" || element.type === "arrow") {
    const points = getLinearElementSamplePoints(element);
    const fill =
      Boolean(element.closed) &&
      element.backgroundColor !== TRANSPARENT_COLOR &&
      points.length > 2 &&
      isPointInPolygon(localPoint, points);
    const stroke = points.some((pointInPath, index) => {
      if (index === 0) {
        return false;
      }

      return (
        distanceSquaredToSegment(localPoint, points[index - 1], pointInPath) <=
        toleranceSquared
      );
    });

    return { fill, stroke };
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
      distanceSquaredToSegment(
        localPoint,
        corner,
        polygon[(index + 1) % polygon.length]
      ) <= toleranceSquared
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
  const shouldProfile = hitTestObservers.size > 0;
  const startedAt = shouldProfile ? getProfileTimestamp() : 0;
  let firstFillHit: KizkattElement | undefined;
  let hitElement: KizkattElement | undefined;
  const candidateIndices = getHitTestCandidateIndices(elements, point);
  const candidateCount = candidateIndices?.length ?? elements.length;

  for (
    let candidateIndex = candidateCount - 1;
    candidateIndex >= 0;
    candidateIndex -= 1
  ) {
    const elementIndex = candidateIndices?.[candidateIndex] ?? candidateIndex;
    const element = elements[elementIndex];
    const hit = getElementHit(element, point);

    if (hit.stroke) {
      hitElement = element;
      break;
    }

    if (!firstFillHit && hit.fill) {
      firstFillHit = element;
    }
  }

  hitElement ??= firstFillHit;

  if (shouldProfile) {
    reportHitTest(elements, point, startedAt, hitElement, candidateCount);
  }

  return hitElement;
}
