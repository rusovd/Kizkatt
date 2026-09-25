import {
  ID_RANDOM_RADIX,
  ID_RANDOM_SLICE_START,
  MIN_ELEMENT_SIZE,
  MIN_PIXEL_SIZE,
  PATH_CLOSED_ENDPOINT_TOLERANCE,
  PERCENT_MAX_VALUE,
  TEXT_ELEMENT_DEFAULT_CONTENT,
  TEXT_ELEMENT_DEFAULT_HEIGHT,
  TEXT_ELEMENT_DEFAULT_WIDTH
} from "../config/constants";
import type {
  ElementType,
  FillStyle,
  KizkattElement,
  ObjectBase,
  Point,
  StyleState
} from "./types";
import { createElementName } from "./naming";
import type { ElementNamingConfig } from "./naming";
import { normalizeGradientFill } from "../geometry/gradients";

const FILL_STYLES = new Set<FillStyle>([
  "monochromeTexture",
  "svgTexture",
  "gradient",
  "crossHatch",
  "hachure",
  "solid"
]);
const LEGACY_MONOCHROME_FILL_STYLE = "blackWhiteTexture";

export function normalizeFillStyle(value: unknown): FillStyle | undefined {
  if (value === LEGACY_MONOCHROME_FILL_STYLE) {
    return "monochromeTexture";
  }

  return typeof value === "string" && FILL_STYLES.has(value as FillStyle)
    ? (value as FillStyle)
    : undefined;
}

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
    ...style,
    endArrowhead:
      type === "arrow" && style.endArrowhead === "none"
        ? "triangle"
        : style.endArrowhead
  };
}

export function normalizeElement(element: KizkattElement): KizkattElement {
  const next = { ...element };
  const fillStyle = normalizeFillStyle(
    (element as KizkattElement & { fillStyle?: unknown }).fillStyle
  );

  if (fillStyle) {
    next.fillStyle = fillStyle;
  }

  if (element.gradientFill) {
    next.gradientFill = normalizeGradientFill(element.gradientFill);
  }

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

    let minX = next.x + points[0].x;
    let minY = next.y + points[0].y;
    let maxX = minX;
    let maxY = minY;

    for (let index = 1; index < points.length; index += 1) {
      const absoluteX = next.x + points[index].x;
      const absoluteY = next.y + points[index].y;
      minX = Math.min(minX, absoluteX);
      minY = Math.min(minY, absoluteY);
      maxX = Math.max(maxX, absoluteX);
      maxY = Math.max(maxY, absoluteY);
    }

    return {
      ...next,
      height: Math.max(MIN_ELEMENT_SIZE, maxY - minY),
      points: points.map((point) => ({
        x: next.x + point.x - minX,
        y: next.y + point.y - minY
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

function cloneOptionalLinearSegmentControls(
  controls?: KizkattElement["linearSegmentControls"]
) {
  return controls?.map((control) =>
    control
      ? {
          ...control,
          cp1: cloneOptionalPoint(control.cp1),
          cp2: cloneOptionalPoint(control.cp2)
        }
      : { mode: "line" as const }
  );
}

export function getObjectBase(element: KizkattElement): ObjectBase {
  const {
    base: _base,
    groupId: _groupId,
    groupName: _groupName,
    id: _id,
    name: _name,
    src: _src,
    svgContent: _svgContent,
    svgUseElementStyle: _svgUseElementStyle,
    svgViewBox: _svgViewBox,
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
    linearSegmentControls: cloneOptionalLinearSegmentControls(
      element.linearSegmentControls
    ),
    points: cloneOptionalPointList(element.points)
  };
}

export function cloneObjectBase(base: ObjectBase): ObjectBase {
  return {
    ...base,
    bends: cloneOptionalPointList(base.bends),
    center: clonePoint(base.center),
    curve: cloneOptionalPoint(base.curve),
    linearSegmentControls: cloneOptionalLinearSegmentControls(
      base.linearSegmentControls
    ),
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
  const {
    groupId,
    groupName,
    id,
    lineCombinationId,
    name,
    src,
    svgContent,
    svgUseElementStyle,
    svgViewBox
  } = element;

  return {
    ...baseElement,
    base,
    groupId,
    groupName,
    id,
    lineCombinationId,
    name,
    src,
    svgContent,
    svgUseElementStyle,
    svgViewBox,
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
    return element.type === "line"
      ? Boolean(element.closed)
      : isElementPathClosed(element);
  }

  return true;
}

export function getElementOpacity(element: Pick<
  KizkattElement,
  "opacity" | "opacityEnabled"
>) {
  return element.opacityEnabled === false
    ? 1
    : element.opacity / PERCENT_MAX_VALUE;
}

export function isBitmapImageElement(element: KizkattElement) {
  if (element.type !== "image" || !element.src || element.svgContent) {
    return false;
  }

  const normalizedSource = element.src.trim().toLowerCase();

  return (
    !normalizedSource.startsWith("data:image/svg+xml") &&
    !normalizedSource.startsWith("blob:image/svg+xml") &&
    !/\.svg(?:$|[?#])/.test(normalizedSource)
  );
}
