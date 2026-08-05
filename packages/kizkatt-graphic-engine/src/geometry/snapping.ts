import { GRID_CELL_SIZE, OBJECT_SNAP_DISTANCE } from "../config/constants";
import type { KizkattElement, Point } from "../model/types";
import { getElementBounds } from "./bounds";
import { getDistance } from "./primitives";

type SnapPointOptions = {
  ignoredIds?: Iterable<string>;
  includeMidpoints?: boolean;
  maxDistance?: number;
};

function getElementSnapPoints(
  element: KizkattElement,
  includeMidpoints = false
) {
  const bounds = getElementBounds(element);
  const left = bounds.x;
  const right = bounds.x + bounds.width;
  const top = bounds.y;
  const bottom = bounds.y + bounds.height;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const cornerPoints = [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom }
  ];

  if (!includeMidpoints) {
    return cornerPoints;
  }

  return [
    ...cornerPoints,
    { x: centerX, y: top },
    { x: right, y: centerY },
    { x: centerX, y: bottom },
    { x: left, y: centerY },
    { x: centerX, y: centerY }
  ];
}

export function snapPointToElements(
  point: Point,
  elements: KizkattElement[],
  {
    ignoredIds = [],
    includeMidpoints = false,
    maxDistance = OBJECT_SNAP_DISTANCE
  }: SnapPointOptions = {}
) {
  const ignoredIdSet = new Set(ignoredIds);
  let nearestPoint: Point | null = null;
  let nearestDistance = maxDistance;

  for (const element of elements) {
    if (ignoredIdSet.has(element.id)) {
      continue;
    }

    for (const snapPoint of getElementSnapPoints(element, includeMidpoints)) {
      const distance = getDistance(point, snapPoint);

      if (distance <= nearestDistance) {
        nearestPoint = snapPoint;
        nearestDistance = distance;
      }
    }
  }

  return nearestPoint ?? point;
}

export function snapPointToGrid(point: Point, cellSize = GRID_CELL_SIZE) {
  return {
    x: Math.round(point.x / cellSize) * cellSize,
    y: Math.round(point.y / cellSize) * cellSize
  };
}
