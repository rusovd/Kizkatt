import type { Bounds, KizkattElement, Point } from "../model/types";
import { createBoundedWeakCache } from "../model/boundedWeakCache";
import { getElementTransformedBounds } from "./bounds";
import { boundsIntersect } from "./primitives";

const SPATIAL_INDEX_CELL_SIZE = 256;
const MAX_INDEXED_CELLS_PER_ELEMENT = 64;
const MAX_CACHED_SCENE_INDICES = 4;

export const SPATIAL_INDEX_MIN_ELEMENT_COUNT = 256;

type SceneSpatialIndex = {
  cells: Map<string, number[]>;
  elementBounds: Bounds[];
  elementIndexById: Map<string, number>;
  globalElementIndices: number[];
};

const sceneSpatialIndexCache = createBoundedWeakCache<
  KizkattElement[],
  SceneSpatialIndex
>(MAX_CACHED_SCENE_INDICES);

function getCellKey(x: number, y: number) {
  return `${x}:${y}`;
}

function getCellCoordinate(value: number) {
  return Math.floor(value / SPATIAL_INDEX_CELL_SIZE);
}

function buildSceneSpatialIndex(elements: KizkattElement[]) {
  const index: SceneSpatialIndex = {
    cells: new Map(),
    elementBounds: [],
    elementIndexById: new Map(),
    globalElementIndices: []
  };

  elements.forEach((element, elementIndex) => {
    const bounds = getElementTransformedBounds(element);
    index.elementBounds.push(bounds);
    index.elementIndexById.set(element.id, elementIndex);
    const tolerance = Math.max(8, element.strokeWidth + 6);
    const minCellX = getCellCoordinate(bounds.x - tolerance);
    const maxCellX = getCellCoordinate(bounds.x + bounds.width + tolerance);
    const minCellY = getCellCoordinate(bounds.y - tolerance);
    const maxCellY = getCellCoordinate(bounds.y + bounds.height + tolerance);
    const occupiedCellCount =
      (maxCellX - minCellX + 1) * (maxCellY - minCellY + 1);

    if (occupiedCellCount > MAX_INDEXED_CELLS_PER_ELEMENT) {
      index.globalElementIndices.push(elementIndex);
      return;
    }

    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
        const key = getCellKey(cellX, cellY);
        const elementIndices = index.cells.get(key);

        if (elementIndices) {
          elementIndices.push(elementIndex);
        } else {
          index.cells.set(key, [elementIndex]);
        }
      }
    }
  });

  return index;
}

function getSceneSpatialIndex(elements: KizkattElement[]) {
  const cachedIndex = sceneSpatialIndexCache.get(elements);

  if (cachedIndex) {
    return cachedIndex;
  }

  const index = buildSceneSpatialIndex(elements);
  sceneSpatialIndexCache.set(elements, index);

  return index;
}

function mergeSortedIndices(first: number[], second: number[]) {
  const merged: number[] = [];
  let firstIndex = 0;
  let secondIndex = 0;

  while (firstIndex < first.length && secondIndex < second.length) {
    if (first[firstIndex] < second[secondIndex]) {
      merged.push(first[firstIndex]);
      firstIndex += 1;
    } else {
      merged.push(second[secondIndex]);
      secondIndex += 1;
    }
  }

  while (firstIndex < first.length) {
    merged.push(first[firstIndex]);
    firstIndex += 1;
  }

  while (secondIndex < second.length) {
    merged.push(second[secondIndex]);
    secondIndex += 1;
  }

  return merged;
}

export function getHitTestCandidateIndices(
  elements: KizkattElement[],
  point: Point
) {
  if (elements.length < SPATIAL_INDEX_MIN_ELEMENT_COUNT) {
    return null;
  }

  const index = getSceneSpatialIndex(elements);
  const cellElementIndices =
    index.cells.get(
      getCellKey(getCellCoordinate(point.x), getCellCoordinate(point.y))
    ) ?? [];

  if (index.globalElementIndices.length === 0) {
    return cellElementIndices;
  }

  if (cellElementIndices.length === 0) {
    return index.globalElementIndices;
  }

  return mergeSortedIndices(cellElementIndices, index.globalElementIndices);
}

export function getElementIndicesInBounds(
  elements: KizkattElement[],
  bounds: Bounds,
  includedIds: ReadonlySet<string> = new Set()
) {
  if (elements.length < SPATIAL_INDEX_MIN_ELEMENT_COUNT) {
    const visibleIndices: number[] = [];

    elements.forEach((element, index) => {
      if (
        includedIds.has(element.id) ||
        boundsIntersect(getElementTransformedBounds(element), bounds)
      ) {
        visibleIndices.push(index);
      }
    });

    return visibleIndices;
  }

  const index = getSceneSpatialIndex(elements);
  const minCellX = getCellCoordinate(bounds.x);
  const maxCellX = getCellCoordinate(bounds.x + bounds.width);
  const minCellY = getCellCoordinate(bounds.y);
  const maxCellY = getCellCoordinate(bounds.y + bounds.height);
  const queriedCellCount =
    (maxCellX - minCellX + 1) * (maxCellY - minCellY + 1);
  const candidates = new Set<number>(index.globalElementIndices);

  if (queriedCellCount <= index.cells.size) {
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
        const cellElementIndices = index.cells.get(getCellKey(cellX, cellY));

        if (cellElementIndices) {
          cellElementIndices.forEach((elementIndex) => {
            candidates.add(elementIndex);
          });
        }
      }
    }
  } else {
    elements.forEach((_, elementIndex) => candidates.add(elementIndex));
  }

  includedIds.forEach((elementId) => {
    const elementIndex = index.elementIndexById.get(elementId);

    if (elementIndex !== undefined) {
      candidates.add(elementIndex);
    }
  });

  return Array.from(candidates)
    .filter(
      (elementIndex) =>
        includedIds.has(elements[elementIndex].id) ||
        boundsIntersect(index.elementBounds[elementIndex], bounds)
    )
    .sort((first, second) => first - second);
}
