import type { PointerEvent } from "react";

import { RESIZE_HANDLES } from "kizkatt-graphic-engine";
import type { ResizeHandle, SkewHandle } from "kizkatt-graphic-engine";

const SKEW_HANDLES: readonly SkewHandle[] = [
  "top",
  "right",
  "bottom",
  "left"
];

export function getEventTargetElement(event: PointerEvent<SVGSVGElement>) {
  return event.target instanceof Element ? event.target : null;
}

export function getHandleTarget(target: Element | null, handle: string) {
  return target?.closest(`[data-handle="${handle}"]`) ?? null;
}

export function isHandleTarget(target: Element | null, handle: string) {
  return getHandleTarget(target, handle) !== null;
}

export function isResizeHandle(value: string | null): value is ResizeHandle {
  return RESIZE_HANDLES.some((entry) => entry.id === value);
}

export function isSkewHandle(value: string | null): value is SkewHandle {
  return SKEW_HANDLES.includes(value as SkewHandle);
}
