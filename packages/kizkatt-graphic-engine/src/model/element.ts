import { MIN_ELEMENT_SIZE } from "../config/constants";
import type { ElementType, KizkattElement, Point, StyleState } from "./types";

export function createId() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

export function createElement(
  type: ElementType,
  point: Point,
  style: StyleState
): KizkattElement {
  return {
    id: createId(),
    type,
    x: point.x,
    y: point.y,
    width: type === "text" ? 128 : 1,
    height: type === "text" ? 36 : 1,
    angle: 0,
    text: type === "text" ? "Text" : undefined,
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
