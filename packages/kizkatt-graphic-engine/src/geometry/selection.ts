import type { KizkattElement, Point } from "../model/types";
import { getElementBounds } from "./bounds";
import { boundsIntersect, getBoundsFromPoints } from "./primitives";

export function getElementIdsInSelectionArea(
  elements: KizkattElement[],
  origin: Point,
  current: Point
) {
  const selection = getBoundsFromPoints(origin, current);
  const selectedIds: string[] = [];

  for (const element of elements) {
    if (boundsIntersect(selection, getElementBounds(element))) {
      selectedIds.push(element.id);
    }
  }

  return selectedIds;
}
