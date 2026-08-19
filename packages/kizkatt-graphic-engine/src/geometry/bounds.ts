import {
  ARROW_ELEMENT_TYPE,
  DRAW_ELEMENT_TYPE,
  EMPTY_COLLECTION_LENGTH,
  FIRST_ARRAY_INDEX,
  LINE_ELEMENT_TYPE,
  MIN_ELEMENT_SIZE,
  NEXT_ARRAY_INDEX_OFFSET,
  NO_ROTATION_ANGLE
} from "../config/constants";
import type { KizkattElement } from "../model/types";
import { getElementBends, getLinearElementPoints } from "./linearElements";
import {
  getBoundsFromPointList,
  getBoundsFromPoints,
  getElementEnd,
  transformElementPoint
} from "./primitives";

export function getElementBounds(element: KizkattElement) {
  if (
    element.type === DRAW_ELEMENT_TYPE &&
    element.points &&
    element.points.length > EMPTY_COLLECTION_LENGTH
  ) {
    const points = element.points;
    let minX = element.x + points[0].x;
    let minY = element.y + points[0].y;
    let maxX = minX;
    let maxY = minY;

    for (let index = 1; index < points.length; index += 1) {
      const x = element.x + points[index].x;
      const y = element.y + points[index].y;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    return {
      height: Math.max(MIN_ELEMENT_SIZE, maxY - minY),
      width: Math.max(MIN_ELEMENT_SIZE, maxX - minX),
      x: minX,
      y: minY
    };
  }

  if (
    (element.type === LINE_ELEMENT_TYPE || element.type === ARROW_ELEMENT_TYPE) &&
    getElementBends(element).length > EMPTY_COLLECTION_LENGTH
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

  if (
    element.angle === NO_ROTATION_ANGLE &&
    (element.skewX ?? 0) === 0 &&
    (element.skewY ?? 0) === 0
  ) {
    return bounds;
  }

  const transformedCorners = getElementTransformedCorners(element, bounds);

  return getBoundsFromPointList(transformedCorners) ?? bounds;
}

export function getElementBoundsCorners(element: KizkattElement) {
  const bounds = getElementBounds(element);

  return [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height }
  ];
}

export function getElementTransformedCorners(
  element: KizkattElement,
  bounds = getElementBounds(element)
) {
  const corners = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height }
  ];

  if (
    element.angle === NO_ROTATION_ANGLE &&
    (element.skewX ?? 0) === 0 &&
    (element.skewY ?? 0) === 0 &&
    !element.flipX &&
    !element.flipY
  ) {
    return corners;
  }

  return corners.map((point) => transformElementPoint(element, point));
}

export function selectionBounds(
  elements: KizkattElement[],
  options: { includeRotation?: boolean } = {}
) {
  if (elements.length === EMPTY_COLLECTION_LENGTH) {
    return null;
  }

  const getBounds = options.includeRotation
    ? getElementTransformedBounds
    : getElementBounds;
  const firstBounds = getBounds(elements[FIRST_ARRAY_INDEX]);
  let minX = firstBounds.x;
  let minY = firstBounds.y;
  let maxX = firstBounds.x + firstBounds.width;
  let maxY = firstBounds.y + firstBounds.height;

  for (
    let index = NEXT_ARRAY_INDEX_OFFSET;
    index < elements.length;
    index += NEXT_ARRAY_INDEX_OFFSET
  ) {
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
