import type { KizkattElement } from "../model/types";
import { getElementBends, getLinearElementPoints } from "./linearElements";
import {
  getBoundsFromPointList,
  getBoundsFromPoints,
  getElementEnd
} from "./primitives";

export function getElementBounds(element: KizkattElement) {
  if (element.type === "draw" && element.points && element.points.length > 0) {
    return (
      getBoundsFromPointList(
        element.points.map((point) => ({
          x: element.x + point.x,
          y: element.y + point.y
        })),
        true
      ) ?? getBoundsFromPoints({ x: element.x, y: element.y }, getElementEnd(element))
    );
  }

  if (
    (element.type === "line" || element.type === "arrow") &&
    getElementBends(element).length > 0
  ) {
    return (
      getBoundsFromPointList(getLinearElementPoints(element), true) ??
      getBoundsFromPoints({ x: element.x, y: element.y }, getElementEnd(element))
    );
  }

  const minX = Math.min(element.x, element.x + element.width);
  const minY = Math.min(element.y, element.y + element.height);
  const maxX = Math.max(element.x, element.x + element.width);
  const maxY = Math.max(element.y, element.y + element.height);

  return {
    height: maxY - minY,
    width: maxX - minX,
    x: minX,
    y: minY
  };
}

export function selectionBounds(elements: KizkattElement[]) {
  if (elements.length === 0) {
    return null;
  }

  const firstBounds = getElementBounds(elements[0]);
  let minX = firstBounds.x;
  let minY = firstBounds.y;
  let maxX = firstBounds.x + firstBounds.width;
  let maxY = firstBounds.y + firstBounds.height;

  for (let index = 1; index < elements.length; index += 1) {
    const bounds = getElementBounds(elements[index]);
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}
