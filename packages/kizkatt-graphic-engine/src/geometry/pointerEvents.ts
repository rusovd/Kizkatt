import type { PointerEvent } from "react";

import type { Point } from "../model/types";

export function getWorldPoint(
  event: PointerEvent<SVGSVGElement>,
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

export function getClientPoint(event: PointerEvent<SVGSVGElement>) {
  return {
    x: Number.isFinite(event.clientX) ? event.clientX : 0,
    y: Number.isFinite(event.clientY) ? event.clientY : 0
  };
}
