import {
  ID_RANDOM_RADIX,
  ID_RANDOM_SLICE_START,
  MIN_ELEMENT_SIZE,
  MIN_PIXEL_SIZE,
  PATH_CLOSED_ENDPOINT_TOLERANCE,
  TEXT_ELEMENT_DEFAULT_CONTENT,
  TEXT_ELEMENT_DEFAULT_HEIGHT,
  TEXT_ELEMENT_DEFAULT_WIDTH
} from "../config/constants";
import type {
  ElementType,
  KizkattElement,
  ObjectBase,
  Point,
  StyleState
} from "./types";
import { createElementName } from "./naming";
import type { ElementNamingConfig } from "./naming";

export function createId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(ID_RANDOM_RADIX).slice(ID_RANDOM_SLICE_START)
  );
}

export function createElement(
  type: ElementType,
  point: Point,
  style: StyleState,
  naming?: ElementNamingConfig
): KizkattElement {
  return {
    id: createId(),
    name: createElementName(type, [], naming),
    type,
    x: point.x,
    y: point.y,
    width: type === "text" ? TEXT_ELEMENT_DEFAULT_WIDTH : MIN_PIXEL_SIZE,
    height: type === "text" ? TEXT_ELEMENT_DEFAULT_HEIGHT : MIN_PIXEL_SIZE,
    angle: 0,
    skewX: 0,
    skewY: 0,
    text: type === "text" ? TEXT_ELEMENT_DEFAULT_CONTENT : undefined,
    points: type === "draw" ? [{ x: 0, y: 0 }] : undefined,
    ...style
  };
}

export function normalizeElement(element: KizkattElement): KizkattElement {
  const next = { ...element };

  if (next.type === "line" || next.type === "arrow") {
    return next;
  }

  if (next.type === "draw") {
    if (next.pathData) {
      return {
        ...next,
        height: Math.max(MIN_ELEMENT_SIZE, next.height),
        width: Math.max(MIN_ELEMENT_SIZE, next.width)
      };
    }

    const points = next.points ?? [];

    if (points.length === 0) {
      return next;
    }

    const absolutePoints = points.map((point) => ({
      x: next.x + point.x,
      y: next.y + point.y
    }));
    const xs = absolutePoints.map((point) => point.x);
    const ys = absolutePoints.map((point) => point.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    return {
      ...next,
      height: Math.max(MIN_ELEMENT_SIZE, maxY - minY),
      points: absolutePoints.map((point) => ({
        x: point.x - minX,
        y: point.y - minY
      })),
      width: Math.max(MIN_ELEMENT_SIZE, maxX - minX),
      x: minX,
      y: minY
    };
  }

  if (next.width < 0) {
    next.x += next.width;
    next.width = Math.abs(next.width);
  }

  if (next.height < 0) {
    next.y += next.height;
    next.height = Math.abs(next.height);
  }

  next.width = Math.max(MIN_ELEMENT_SIZE, next.width);
  next.height = Math.max(MIN_ELEMENT_SIZE, next.height);

  return next;
}

function clonePoint(point: Point): Point {
  return { x: point.x, y: point.y };
}

function cloneOptionalPoint(point?: Point) {
  return point ? clonePoint(point) : undefined;
}

function cloneOptionalPointList(points?: Point[]) {
  return points?.map(clonePoint);
}

export function getObjectBase(element: KizkattElement): ObjectBase {
  const {
    base: _base,
    groupId: _groupId,
    groupName: _groupName,
    id: _id,
    name: _name,
    x,
    y,
    ...baseElement
  } = element;

  return {
    ...baseElement,
    bends: cloneOptionalPointList(element.bends),
    center: {
      x: x + element.width / 2,
      y: y + element.height / 2
    },
    curve: cloneOptionalPoint(element.curve),
    points: cloneOptionalPointList(element.points)
  };
}

export function cloneObjectBase(base: ObjectBase): ObjectBase {
  return {
    ...base,
    bends: cloneOptionalPointList(base.bends),
    center: clonePoint(base.center),
    curve: cloneOptionalPoint(base.curve),
    points: cloneOptionalPointList(base.points)
  };
}

export function withUpdatedObjectBase(
  element: KizkattElement
): KizkattElement {
  return {
    ...element,
    base: getObjectBase(element)
  };
}

export function revertElementToObjectBase(
  element: KizkattElement
): KizkattElement {
  if (!element.base) {
    return element;
  }

  const base = cloneObjectBase(element.base);
  const { center, ...baseElement } = base;

  return {
    ...element,
    ...baseElement,
    base,
    x: center.x - base.width / 2,
    y: center.y - base.height / 2
  };
}

export function getElementPathEndpoints(element: KizkattElement) {
  if (element.type === "line" || element.type === "arrow") {
    return {
      end: {
        x: element.x + element.width,
        y: element.y + element.height
      },
      start: {
        x: element.x,
        y: element.y
      }
    };
  }

  if (element.type === "draw") {
    const points = element.points ?? [];
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    if (!firstPoint || !lastPoint) {
      return null;
    }

    return {
      end: {
        x: element.x + lastPoint.x,
        y: element.y + lastPoint.y
      },
      start: {
        x: element.x + firstPoint.x,
        y: element.y + firstPoint.y
      }
    };
  }

  return null;
}

export function isElementPathClosed(element: KizkattElement) {
  if (element.type !== "line" && element.type !== "draw") {
    return false;
  }

  if (element.closed) {
    return true;
  }

  const endpoints = getElementPathEndpoints(element);

  if (!endpoints) {
    return false;
  }

  if (element.type === "line" && (element.bends?.length ?? 0) === 0) {
    return false;
  }

  return Math.hypot(
    endpoints.end.x - endpoints.start.x,
    endpoints.end.y - endpoints.start.y
  ) <= PATH_CLOSED_ENDPOINT_TOLERANCE;
}

export function canElementUseBackground(element: KizkattElement) {
  if (element.type === "arrow") {
    return false;
  }

  if (element.type === "image") {
    return Boolean(element.svgContent);
  }

  if (element.type === "line" || element.type === "draw") {
    return isElementPathClosed(element);
  }

  return true;
}
