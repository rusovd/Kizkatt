import type { PointerEvent } from "react";

import { RESIZE_HANDLES } from "../../config/constants";
import type { ResizeHandle } from "../../model/types";

export function getEventTargetElement(event: PointerEvent<SVGSVGElement>) {
  return event.target instanceof Element ? event.target : null;
}

export function isHandleTarget(target: Element | null, handle: string) {
  return target?.getAttribute("data-handle") === handle;
}

export function isResizeHandle(value: string | null): value is ResizeHandle {
  return RESIZE_HANDLES.some((entry) => entry.id === value);
}
