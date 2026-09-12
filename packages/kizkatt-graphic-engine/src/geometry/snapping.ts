import { GRID_CELL_SIZE, OBJECT_SNAP_DISTANCE } from "../config/constants";
import { getIdSet } from "../model/collections";
import { createBoundedWeakCache } from "../model/boundedWeakCache";
import type { KizkattElement, Point } from "../model/types";
import { getElementBounds } from "./bounds";
import { SPATIAL_INDEX_MIN_ELEMENT_COUNT } from "./spatialIndex";

const SNAP_INDEX_CELL_SIZE = 128;
const MAX_CACHED_SNAP_INDICES = 2;

type SnapPointOptions = {
  ignoredIds?: Iterable<string>;
  includeMidpoints?: boolean;
  maxDistance?: number;
};

type IndexedSnapPoint = Point & {
  elementId: string;
  order: number;
};

type SnapPointIndex = Map<string, IndexedSnapPoint[]>;

const cornerIndexCache = createBoundedWeakCache<
  KizkattElement[],
  SnapPointIndex
>(MAX_CACHED_SNAP_INDICES);
const midpointIndexCache = createBoundedWeakCache<
  KizkattElement[],
  SnapPointIndex
>(MAX_CACHED_SNAP_INDICES);

function getCellCoordinate(value: number) {
  return Math.floor(value / SNAP_INDEX_CELL_SIZE);
}

function getCellKey(x: number, y: number) {
  return `${x}:${y}`;
}

function addIndexedPoint(index: SnapPointIndex, point: IndexedSnapPoint) {
  const key = getCellKey(
    getCellCoordinate(point.x),
    getCellCoordinate(point.y)
  );
  const points = index.get(key);

  if (points) {
    points.push(point);
  } else {
    index.set(key, [point]);
  }
}

function buildSnapPointIndex(
  elements: KizkattElement[],
  includeMidpoints: boolean
) {
  const index: SnapPointIndex = new Map();
  let order = 0;

  for (const element of elements) {
    const bounds = getElementBounds(element);
    const left = bounds.x;
    const right = bounds.x + bounds.width;
    const top = bounds.y;
    const bottom = bounds.y + bounds.height;
    const points = [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left, y: bottom }
    ];

    if (includeMidpoints) {
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      points.push(
        { x: centerX, y: top },
        { x: right, y: centerY },
        { x: centerX, y: bottom },
        { x: left, y: centerY },
        { x: centerX, y: centerY }
      );
    }

    for (const point of points) {
      addIndexedPoint(index, {
        ...point,
        elementId: element.id,
        order
      });
      order += 1;
    }
  }

  return index;
}

function getSnapPointIndex(
  elements: KizkattElement[],
  includeMidpoints: boolean
) {
  const cache = includeMidpoints ? midpointIndexCache : cornerIndexCache;
  const cachedIndex = cache.get(elements);

  if (cachedIndex) {
    return cachedIndex;
  }

  const index = buildSnapPointIndex(elements, includeMidpoints);
  cache.set(elements, index);

  return index;
}

function getNearbySnapPoints(
  elements: KizkattElement[],
  point: Point,
  includeMidpoints: boolean,
  maxDistance: number
) {
  const index = getSnapPointIndex(elements, includeMidpoints);
  const minCellX = getCellCoordinate(point.x - maxDistance);
  const maxCellX = getCellCoordinate(point.x + maxDistance);
  const minCellY = getCellCoordinate(point.y - maxDistance);
  const maxCellY = getCellCoordinate(point.y + maxDistance);
  const candidates: IndexedSnapPoint[] = [];

  for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
    for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
      const cellPoints = index.get(getCellKey(cellX, cellY));

      if (cellPoints) {
        candidates.push(...cellPoints);
      }
    }
  }

  candidates.sort((first, second) => first.order - second.order);

  return candidates;
}

function getIgnoredIdSet(ignoredIds: Iterable<string>) {
  if (ignoredIds instanceof Set) {
    return ignoredIds;
  }

  if (Array.isArray(ignoredIds)) {
    return getIdSet(ignoredIds);
  }

  return new Set(ignoredIds);
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
  const ignoredIdSet = getIgnoredIdSet(ignoredIds);
  const snapDistance = Math.abs(maxDistance);
  let nearestX = 0;
  let nearestY = 0;
  let nearestDistanceSquared = snapDistance * snapDistance;
  let hasNearestPoint = false;

  const considerPoint = (x: number, y: number) => {
    const dx = point.x - x;
    const dy = point.y - y;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared <= nearestDistanceSquared) {
      nearestX = x;
      nearestY = y;
      nearestDistanceSquared = distanceSquared;
      hasNearestPoint = true;
    }
  };

  if (
    elements.length >= SPATIAL_INDEX_MIN_ELEMENT_COUNT &&
    Number.isFinite(snapDistance) &&
    snapDistance <= SNAP_INDEX_CELL_SIZE * 8
  ) {
    const candidates = getNearbySnapPoints(
      elements,
      point,
      includeMidpoints,
      snapDistance
    );

    for (const candidate of candidates) {
      if (!ignoredIdSet.has(candidate.elementId)) {
        considerPoint(candidate.x, candidate.y);
      }
    }
  } else {
    for (const element of elements) {
      if (ignoredIdSet.has(element.id)) {
        continue;
      }

      const bounds = getElementBounds(element);
      const left = bounds.x;
      const right = bounds.x + bounds.width;
      const top = bounds.y;
      const bottom = bounds.y + bounds.height;

      considerPoint(left, top);
      considerPoint(right, top);
      considerPoint(right, bottom);
      considerPoint(left, bottom);

      if (includeMidpoints) {
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;

        considerPoint(centerX, top);
        considerPoint(right, centerY);
        considerPoint(centerX, bottom);
        considerPoint(left, centerY);
        considerPoint(centerX, centerY);
      }
    }
  }

  return hasNearestPoint ? { x: nearestX, y: nearestY } : point;
}

export function snapPointToGrid(point: Point, cellSize = GRID_CELL_SIZE) {
  return {
    x: Math.round(point.x / cellSize) * cellSize,
    y: Math.round(point.y / cellSize) * cellSize
  };
}
