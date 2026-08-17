import type { Point } from "../model/types";

type PointerCoordinates = {
  clientX: number;
  clientY: number;
};

export function getWorldPoint(
  event: PointerCoordinates,
  svg: SVGSVGElement | null,
  zoom: number,
  pan: Point
) {
  const rect = svg?.getBoundingClientRect();
  const left = rect?.left ?? 0;
  const top = rect?.top ?? 0;
  const clientX = Number.isFinite(event.clientX) ? event.clientX : 0;
  const clientY = Number.isFinite(event.clientY) ? event.clientY : 0;

  return {
    x: (clientX - left - pan.x) / zoom,
    y: (clientY - top - pan.y) / zoom
  };
}

export function getClientPoint(event: PointerCoordinates) {
  return {
    x: Number.isFinite(event.clientX) ? event.clientX : 0,
    y: Number.isFinite(event.clientY) ? event.clientY : 0
  };
}
