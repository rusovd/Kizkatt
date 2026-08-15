import { PNG_EXPORT_PADDING, VIEWPORT_CENTER_DIVISOR } from "../config/constants";
import { selectionBounds } from "../geometry";
import type { Bounds, KizkattElement } from "../model/types";

function inflateBounds(bounds: Bounds, padding: number): Bounds {
  return {
    height: bounds.height + padding * VIEWPORT_CENTER_DIVISOR,
    width: bounds.width + padding * VIEWPORT_CENTER_DIVISOR,
    x: bounds.x - padding,
    y: bounds.y - padding
  };
}

export function getExportBounds(elements: KizkattElement[]): Bounds | null {
  const bounds = selectionBounds(elements, { includeRotation: true });

  if (!bounds) {
    return null;
  }

  const maxStrokeWidth = Math.max(
    PNG_EXPORT_PADDING,
    ...elements.map((element) => element.strokeWidth)
  );

  return inflateBounds(bounds, maxStrokeWidth);
}
