import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM } from "../config/constants";
import type { Bounds, KizkattElement, Point } from "../model/types";
import { selectionBounds } from "./bounds";

export type ViewportFitMode = "contain" | "width" | "height";

export type ViewportSize = {
  height: number;
  width: number;
};

export type ViewportTransform = {
  pan: Point;
  zoom: number;
};

export type ViewportZoomAction =
  | "selected"
  | "all"
  | "page"
  | "pageWidth"
  | "pageHeight";

const DEFAULT_VIEWPORT_PADDING = 40;
const MIN_PAGE_MARGIN = 64;
const PAGE_MARGIN_RATIO = 0.08;

export function clampViewportZoom(
  zoom: number,
  minZoom = MIN_ZOOM,
  maxZoom = MAX_ZOOM
) {
  return Math.min(maxZoom, Math.max(minZoom, zoom));
}


export function zoomViewportAtPoint(
  transform: ViewportTransform,
  nextZoom: number,
  pivot: Point,
  limits: { max?: number; min?: number } = {}
): ViewportTransform {
  const zoom = clampViewportZoom(
    nextZoom,
    limits.min ?? MIN_ZOOM,
    limits.max ?? MAX_ZOOM
  );
  const currentZoom = Math.max(Number.EPSILON, transform.zoom);
  const worldPoint = {
    x: (pivot.x - transform.pan.x) / currentZoom,
    y: (pivot.y - transform.pan.y) / currentZoom
  };

  return {
    zoom,
    pan: {
      x: pivot.x - worldPoint.x * zoom,
      y: pivot.y - worldPoint.y * zoom
    }
  };
}

export function panViewportByWheel(pan: Point, delta: Point): Point {
  return {
    x: pan.x - delta.x,
    y: pan.y - delta.y
  };
}

export function fitBoundsInViewport(
  bounds: Bounds,
  viewport: ViewportSize,
  options: {
    maxZoom?: number;
    minZoom?: number;
    mode?: ViewportFitMode;
    padding?: number;
  } = {}
): ViewportTransform | null {
  if (
    bounds.width <= 0 ||
    bounds.height <= 0 ||
    viewport.width <= 0 ||
    viewport.height <= 0
  ) {
    return null;
  }

  const padding = Math.max(0, options.padding ?? DEFAULT_VIEWPORT_PADDING);
  const availableWidth = Math.max(1, viewport.width - padding * 2);
  const availableHeight = Math.max(1, viewport.height - padding * 2);
  const widthZoom = availableWidth / bounds.width;
  const heightZoom = availableHeight / bounds.height;
  const mode = options.mode ?? "contain";
  const requestedZoom =
    mode === "width"
      ? widthZoom
      : mode === "height"
        ? heightZoom
        : Math.min(widthZoom, heightZoom);
  const zoom = clampViewportZoom(
    requestedZoom,
    options.minZoom ?? MIN_ZOOM,
    options.maxZoom ?? MAX_ZOOM
  );
  const center = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  };

  return {
    zoom,
    pan: {
      x: viewport.width / 2 - center.x * zoom,
      y: viewport.height / 2 - center.y * zoom
    }
  };
}

export function getElementsViewportBounds(
  elements: readonly KizkattElement[]
) {
  return selectionBounds(elements, { includeRotation: true });
}


export function getLogicalPageBounds(
  elements: readonly KizkattElement[],
  viewport: ViewportSize
): Bounds {
  const contentBounds = getElementsViewportBounds(elements);

  if (!contentBounds) {
    return {
      x: 0,
      y: 0,
      width: viewport.width / DEFAULT_ZOOM,
      height: viewport.height / DEFAULT_ZOOM
    };
  }

  const margin = Math.max(
    MIN_PAGE_MARGIN,
    Math.max(contentBounds.width, contentBounds.height) * PAGE_MARGIN_RATIO
  );

  return {
    x: contentBounds.x - margin,
    y: contentBounds.y - margin,
    width: contentBounds.width + margin * 2,
    height: contentBounds.height + margin * 2
  };
}
