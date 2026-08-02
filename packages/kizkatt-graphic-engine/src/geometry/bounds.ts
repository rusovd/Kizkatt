import type { KizkattElement } from "../model/types";
import { getElementBends, getLinearElementPoints } from "./linearElements";
import {
  getBoundsFromPointList,
  getBoundsFromPoints,
  getElementAxes,
  getElementCenter,
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

export function getElementTransformedBounds(element: KizkattElement) {
  const bounds = getElementBounds(element);

  if (element.angle === 0) {
    return bounds;
  }

  const center = getElementCenter(element);
  const { xAxis, yAxis } = getElementAxes(element.angle);
  const localCorners = [
    { x: bounds.x - center.x, y: bounds.y - center.y },
    { x: bounds.x + bounds.width - center.x, y: bounds.y - center.y },
    {
      x: bounds.x + bounds.width - center.x,
      y: bounds.y + bounds.height - center.y
    },
    { x: bounds.x - center.x, y: bounds.y + bounds.height - center.y }
  ];
  const transformedCorners = localCorners.map((corner) => ({
    x: center.x + corner.x * xAxis.x + corner.y * yAxis.x,
    y: center.y + corner.x * xAxis.y + corner.y * yAxis.y
  }));

  return getBoundsFromPointList(transformedCorners) ?? bounds;
}

export function selectionBounds(
  elements: KizkattElement[],
  options: { includeRotation?: boolean } = {}
) {
  if (elements.length === 0) {
    return null;
  }

  const getBounds = options.includeRotation
    ? getElementTransformedBounds
    : getElementBounds;
  const firstBounds = getBounds(elements[0]);
  let minX = firstBounds.x;
  let minY = firstBounds.y;
  let maxX = firstBounds.x + firstBounds.width;
  let maxY = firstBounds.y + firstBounds.height;

  for (let index = 1; index < elements.length; index += 1) {
    const bounds = getBounds(elements[index]);
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
