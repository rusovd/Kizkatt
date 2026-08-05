import type {
  Bounds,
  KizkattElement,
  Point,
  SelectionAreaMode
} from "../model/types";
import { expandElementIdsToGroups } from "../model/groups";
import { getElementBounds, getElementTransformedBounds } from "./bounds";
import { boundsIntersect, getBoundsFromPoints } from "./primitives";

function boundsContain(outer: Bounds, inner: Bounds) {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

export function getElementIdsInSelectionArea(
  elements: KizkattElement[],
  origin: Point,
  current: Point,
  mode: SelectionAreaMode = "intersect"
) {
  const selection = getBoundsFromPoints(origin, current);
  const selectedIds: string[] = [];

  for (const element of elements) {
    const bounds =
      mode === "contain"
        ? getElementTransformedBounds(element)
        : getElementBounds(element);
    const isSelected =
      mode === "contain"
        ? boundsContain(selection, bounds)
        : boundsIntersect(selection, bounds);

    if (isSelected) {
      selectedIds.push(element.id);
    }
  }

  return expandElementIdsToGroups(elements, selectedIds);
}
