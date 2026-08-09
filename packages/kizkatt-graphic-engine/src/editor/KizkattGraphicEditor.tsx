import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import type {
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent
} from "react";

import {
  DEFAULT_ELEMENT_STYLE_BY_THEME,
  ARROW_MARKER_HEIGHT,
  ARROW_MARKER_ORIENT,
  ARROW_MARKER_PATH,
  ARROW_MARKER_REF_X,
  ARROW_MARKER_REF_Y,
  ARROW_MARKER_VIEW_BOX,
  ARROW_MARKER_WIDTH,
  CANVAS_TAB_INDEX,
  DEFAULT_BOARD_ARIA_LABEL,
  DEFAULT_ARROW_MARKER_ID,
  DEFAULT_CANVAS_ARIA_LABEL,
  DEFAULT_EDGE_STYLE,
  DEFAULT_FILL_STYLE,
  DEFAULT_FILL_WEIGHT,
  DEFAULT_IMAGE_INPUT_ARIA_LABEL,
  DEFAULT_ZOOM,
  DEFAULT_SELECTED_SLOPPINESS,
  EMPTY_COLLECTION_LENGTH,
  DUPLICATED_ELEMENT_OFFSET,
  EMPTY_INPUT_VALUE,
  DEFAULT_IMAGE_SIZE,
  EXPORT_CANVAS_IMAGE_ERROR_MESSAGE,
  IMAGE_LOAD_FALLBACK_TIMEOUT_MS,
  IMAGE_FILE_ACCEPT,
  IMAGE_MIME_TYPE_PREFIX,
  INITIAL_PAN,
  MAX_PASTED_IMAGE_SIZE,
  MIN_ELEMENT_SIZE,
  MAX_ZOOM,
  MIN_PIXEL_SIZE,
  MIN_ZOOM,
  PASTED_TEXT_CHARACTER_WIDTH,
  PASTED_TEXT_LINE_HEIGHT,
  PASTED_TEXT_MAX_WIDTH,
  PERCENT_MAX_VALUE,
  PLAIN_TEXT_MIME_TYPE,
  PNG_EXPORT_DPI,
  PNG_EXPORT_PADDING,
  PNG_IMAGE_MIME_TYPE,
  SCREEN_DPI,
  SELECTION_LINK_PREFIX,
  SINGLE_SELECTION_COUNT,
  SVG_IMAGE_MIME_TYPE,
  TEXT_ELEMENT_DEFAULT_HEIGHT,
  TEXT_ELEMENT_DEFAULT_WIDTH,
  TRANSPARENT_COLOR,
  VIEWPORT_CENTER_DIVISOR,
  ZOOM_STEP
} from "../config/constants";
import { createElement, createId, normalizeElement } from "../model/element";
import {
  createElementName as buildElementName,
  createGroupName,
  normalizeElementNames
} from "../model/naming";
import type { ElementNamingConfig } from "../model/naming";
import {
  canGroupSelection,
  canUngroupSelection,
  cloneElementsWithFreshIdsAndGroups,
  expandElementIdsToGroups,
  groupSelectedElements,
  ungroupSelectedElements
} from "../model/groups";
import {
  getElementBends,
  getGridWorldSizing,
  getResizeCursor,
  reorderElementsByLayerAction,
  selectionBounds,
  transformSvgPathData
} from "../geometry";
import {
  isAllowedEditingShortcut,
  isEditableKeyboardTarget,
  stopDrawingEngineShortcuts,
  EDITING_SHORTCUT_KEY,
  EDITOR_KEY
} from "../platform/keyboard";
import { useCanvasHistory } from "../hooks/useCanvasHistory";
import {
  getStoredCanvasBackgroundColor,
  getStoredCanvasState,
  getStoredCustomCanvasBackgroundColor,
  getStoredGridColor,
  getStoredGridSettings,
  getStoredQuickCanvasState,
  getStoredTheme,
  getStoredUiScale,
  normalizeGridSettings,
  storeCanvasBackgroundColor,
  storeCanvasState,
  storeCustomCanvasBackgroundColor,
  storeGridColor,
  storeGridSettings,
  storeQuickCanvasState,
  storeTheme,
  storeUiScale
} from "../platform/storage";
import { useToolPointerHandlers } from "../tools/pointer";
import type {
  Bounds,
  ContextMenuState,
  GridSettings,
  Interaction,
  KizkattElement,
  Point,
  SelectionAreaMode,
  StyleState,
  KizkattTheme,
  Tool
} from "../model/types";
import type { SvgSerializeOptions } from "../export/svgExport";

type EyeDropperConstructor = new () => {
  open: () => Promise<{ sRGBHex: string }>;
};

const SVG_FRAGMENT_DEFAULT_SIZE = 24;
const SVG_JSX_ATTRIBUTE_MAP = new Map([
  ["className", "class"],
  ["clipPath", "clip-path"],
  ["clipRule", "clip-rule"],
  ["fillOpacity", "fill-opacity"],
  ["fillRule", "fill-rule"],
  ["strokeDasharray", "stroke-dasharray"],
  ["strokeLinecap", "stroke-linecap"],
  ["strokeLinejoin", "stroke-linejoin"],
  ["strokeOpacity", "stroke-opacity"],
  ["strokeWidth", "stroke-width"]
]);
const SVG_STYLE_ATTRIBUTE_NAMES = new Set([
  "color",
  "display",
  "fill",
  "fill-opacity",
  "opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-opacity",
  "stroke-width",
  "visibility"
]);
const SVG_ROOT_CONTENT_ATTRIBUTE_BLOCKLIST = new Set([
  "aria-label",
  "class",
  "height",
  "role",
  "style",
  "version",
  "viewBox",
  "viewbox",
  "width",
  "xmlns",
  "xmlns:xlink"
]);
const SVG_URL_ATTRIBUTE_NAMES = new Set(["href", "xlink:href"]);
const SVG_GENERIC_GRAPHIC_ELEMENT_SELECTOR = [
  "circle",
  "ellipse",
  "image",
  "line",
  "path",
  "polygon",
  "polyline",
  "rect",
  "text"
].join(", ");
const SVG_IMPORT_ELEMENT_TYPES = new Set([
  "arrow",
  "diamond",
  "draw",
  "ellipse",
  "image",
  "line",
  "rectangle",
  "text"
]);
const SVG_RADIANS_PER_DEGREE = Math.PI / 180;
const SVG_TRANSFORM_FUNCTION_PATTERN = /([a-zA-Z]+)\(([^)]*)\)/g;
const SVG_TRANSFORM_EPSILON = 0.000001;
const SVG_ELLIPSE_PATH_KAPPA = 0.5522847498307936;

function getFittedImageSize(width: number, height: number) {
  if (width <= 0 || height <= 0) {
    return DEFAULT_IMAGE_SIZE;
  }

  const scale = Math.min(
    1,
    MAX_PASTED_IMAGE_SIZE.width / width,
    MAX_PASTED_IMAGE_SIZE.height / height
  );

  return {
    height: Math.max(MIN_PIXEL_SIZE, Math.round(height * scale)),
    width: Math.max(MIN_PIXEL_SIZE, Math.round(width * scale))
  };
}

function getImageSize(width: number, height: number) {
  return {
    height: Math.max(MIN_PIXEL_SIZE, Math.round(height)),
    width: Math.max(MIN_PIXEL_SIZE, Math.round(width))
  };
}

function parseSvgLength(value: string | null) {
  if (!value) {
    return null;
  }

  const numericValue = Number.parseFloat(value);

  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : null;
}

function parseSvgNumber(value: string | null) {
  if (!value) {
    return null;
  }

  const numericValue = Number.parseFloat(value);

  return Number.isFinite(numericValue) ? numericValue : null;
}

function parseSvgViewBox(value: string | null) {
  if (!value) {
    return null;
  }

  const parts = value
    .trim()
    .split(/[\s,]+/)
    .map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  const [x, y, width, height] = parts;

  return width > 0 && height > 0 ? { height, width, x, y } : null;
}

function getSvgRoot(document: Document) {
  const root = document.documentElement;

  return root?.tagName.toLowerCase() === "svg" ? (root as SVGSVGElement) : null;
}

function parseSvgDocument(svgCode: string) {
  return new DOMParser().parseFromString(svgCode, "image/svg+xml");
}

function createSvgDocumentFromCode(svgCode: string) {
  const document = parseSvgDocument(svgCode);

  if (getSvgRoot(document) && !document.querySelector("parsererror")) {
    return document;
  }

  return parseSvgDocument(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_FRAGMENT_DEFAULT_SIZE} ${SVG_FRAGMENT_DEFAULT_SIZE}">${svgCode}</svg>`
  );
}

function normalizeSvgAttributes(element: Element) {
  Array.from(element.attributes).forEach((attribute) => {
    if (attribute.name.toLowerCase().startsWith("on")) {
      element.removeAttribute(attribute.name);
      return;
    }

    const normalizedName = SVG_JSX_ATTRIBUTE_MAP.get(attribute.name);

    if (normalizedName) {
      element.setAttribute(normalizedName, attribute.value);
      element.removeAttribute(attribute.name);
      return;
    }

    if (
      SVG_URL_ATTRIBUTE_NAMES.has(attribute.name) &&
      attribute.value.trim().toLowerCase().startsWith("javascript:")
    ) {
      element.removeAttribute(attribute.name);
    }
  });

  const style = element.getAttribute("style");

  if (!style) {
    return;
  }

  style.split(";").forEach((declaration) => {
    const separatorIndex = declaration.indexOf(":");

    if (separatorIndex < 0) {
      return;
    }

    const rawName = declaration.slice(0, separatorIndex).trim();
    const value = declaration.slice(separatorIndex + 1).trim();
    const name = SVG_JSX_ATTRIBUTE_MAP.get(rawName) ?? rawName;

    if (SVG_STYLE_ATTRIBUTE_NAMES.has(name) && value && !element.hasAttribute(name)) {
      element.setAttribute(name, value);
    }
  });
}

function getSvgContent(root: SVGSVGElement) {
  const rootContentAttributes = Array.from(root.attributes).filter(
    (attribute) =>
      !SVG_ROOT_CONTENT_ATTRIBUTE_BLOCKLIST.has(attribute.name) &&
      !attribute.name.toLowerCase().startsWith("on")
  );

  if (rootContentAttributes.length === 0) {
    return root.innerHTML;
  }

  const contentGroup = root.ownerDocument.createElementNS(
    "http://www.w3.org/2000/svg",
    "g"
  );

  rootContentAttributes.forEach((attribute) => {
    contentGroup.setAttribute(attribute.name, attribute.value);
  });

  while (root.firstChild) {
    contentGroup.appendChild(root.firstChild);
  }

  root.appendChild(contentGroup);

  return root.innerHTML;
}

function parseSvgCode(svgCode: string) {
  const trimmedCode = svgCode.trim();

  if (!trimmedCode) {
    return null;
  }

  const document = createSvgDocumentFromCode(trimmedCode);
  const root = getSvgRoot(document);

  if (!root || document.querySelector("parsererror")) {
    return null;
  }

  root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  root
    .querySelectorAll("script, foreignObject, style")
    .forEach((element) => element.remove());
  [root, ...Array.from(root.querySelectorAll("*"))].forEach(
    normalizeSvgAttributes
  );
  const isKizkattExport =
    root.classList.contains("kizkatt-canvas") ||
    Boolean(root.querySelector("[data-element-id]"));

  const viewBoxSize = parseSvgViewBox(root.getAttribute("viewBox"));
  const intrinsicWidth =
    parseSvgLength(root.getAttribute("width")) ?? viewBoxSize?.width;
  const intrinsicHeight =
    parseSvgLength(root.getAttribute("height")) ?? viewBoxSize?.height;
  const viewBox =
    root.getAttribute("viewBox") ??
    `0 0 ${intrinsicWidth ?? DEFAULT_IMAGE_SIZE.width} ${
      intrinsicHeight ?? DEFAULT_IMAGE_SIZE.height
    }`;
  const rawWidth = intrinsicWidth ?? DEFAULT_IMAGE_SIZE.width;
  const rawHeight = intrinsicHeight ?? DEFAULT_IMAGE_SIZE.height;
  const size = isKizkattExport
    ? getImageSize(rawWidth, rawHeight)
    : getFittedImageSize(rawWidth, rawHeight);

  return {
    content: getSvgContent(root),
    size,
    useElementStyle: !isKizkattExport,
    viewBox
  };
}

function isKizkattSvgCode(svgCode: string) {
  const document = parseSvgDocument(svgCode);
  const root = getSvgRoot(document);

  return Boolean(
    root &&
      !document.querySelector("parsererror") &&
      (root.classList.contains("kizkatt-canvas") ||
        root.querySelector("[data-element-id]"))
  );
}

function isSvgCode(svgCode: string) {
  const document = parseSvgDocument(svgCode);

  return Boolean(getSvgRoot(document) && !document.querySelector("parsererror"));
}

function isBreakApartableSvgElement(element: KizkattElement) {
  const svgCode = getSvgCodeFromDataUrl(element.src);

  return (
    element.type === "image" &&
    (Boolean(element.svgContent) || Boolean(svgCode && isSvgCode(svgCode)))
  );
}

function getSvgCodeFromDataUrl(src?: string) {
  if (!src?.startsWith("data:image/svg+xml")) {
    return null;
  }

  const commaIndex = src.indexOf(",");

  if (commaIndex < 0) {
    return null;
  }

  const header = src.slice(0, commaIndex).toLowerCase();
  const data = src.slice(commaIndex + 1);

  try {
    return header.includes(";base64")
      ? window.atob(data)
      : decodeURIComponent(data);
  } catch {
    return null;
  }
}

function getBreakApartSvgCode(element: KizkattElement) {
  if (element.svgContent) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${
      element.svgViewBox ?? `0 0 ${element.width} ${element.height}`
    }">${element.svgContent}</svg>`;
  }

  return getSvgCodeFromDataUrl(element.src);
}

function getSvgNumber(element: Element, attributeName: string) {
  return parseSvgLength(element.getAttribute(attributeName));
}

function getInheritedSvgAttribute(element: Element, attributeName: string) {
  let currentElement: Element | null = element;

  while (currentElement) {
    const attributeValue = currentElement.getAttribute(attributeName);

    if (attributeValue !== null) {
      return attributeValue;
    }

    currentElement = currentElement.parentElement;
  }

  return null;
}

function parseSvgOpacity(value: string | null) {
  if (!value) {
    return PERCENT_MAX_VALUE;
  }

  const parsedValue = Number.parseFloat(value);

  return Number.isFinite(parsedValue)
    ? Math.max(0, Math.min(PERCENT_MAX_VALUE, parsedValue * PERCENT_MAX_VALUE))
    : PERCENT_MAX_VALUE;
}

function resolveSvgPaint(value: string | null, currentColor: string) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim();
  const normalizedLowerValue = normalizedValue.toLowerCase();

  if (
    !normalizedValue ||
    normalizedLowerValue === "none" ||
    normalizedLowerValue.startsWith("url(")
  ) {
    return null;
  }

  return normalizedLowerValue === "currentcolor"
    ? currentColor
    : normalizedValue;
}

function getSvgStrokeStyle(element: Element): KizkattElement["strokeStyle"] {
  const dasharray = getInheritedSvgAttribute(element, "stroke-dasharray");

  if (!dasharray || dasharray === "none") {
    return "solid";
  }

  const dashValues = dasharray
    .split(/[\s,]+/)
    .map((value) => Number.parseFloat(value))
    .filter(Number.isFinite);

  if (dashValues.length >= 2 && dashValues[0] <= dashValues[1]) {
    return "dotted";
  }

  return "dashed";
}

function getSvgElementStyle(
  group: Element,
  element: Element,
  fallbackStyle: StyleState
) {
  const currentColor =
    resolveSvgPaint(
      getInheritedSvgAttribute(element, "color"),
      fallbackStyle.strokeColor
    ) ?? fallbackStyle.strokeColor;
  const stroke = resolveSvgPaint(
    getInheritedSvgAttribute(element, "stroke"),
    currentColor
  );
  const fill = resolveSvgPaint(
    getInheritedSvgAttribute(element, "fill"),
    currentColor
  );
  const strokeWidth = getSvgNumber(element, "stroke-width");
  const secondaryStroke = group.querySelector("[data-sloppiness-stroke]");
  const primaryElementHasFilter = Boolean(
    getInheritedSvgAttribute(element, "filter")?.includes("kizkatt-sloppy")
  );
  const spacing = secondaryStroke
    ? Number.parseFloat(
        secondaryStroke.getAttribute("data-sloppiness-spacing") ?? ""
      )
    : null;
  const sloppiness =
    secondaryStroke && primaryElementHasFilter
      ? "cartoonist"
      : secondaryStroke
        ? "double"
        : primaryElementHasFilter
          ? "artist"
          : "architect";

  return {
    backgroundColor: fill ?? TRANSPARENT_COLOR,
    fillStyle: DEFAULT_FILL_STYLE,
    fillWeight: DEFAULT_FILL_WEIGHT,
    opacity: parseSvgOpacity(getInheritedSvgAttribute(element, "opacity")),
    sloppiness,
    sloppinessGap:
      Number.isFinite(spacing) && strokeWidth
        ? Math.max(0, (spacing as number) - strokeWidth)
        : fallbackStyle.sloppinessGap,
    strokeColor: stroke ?? TRANSPARENT_COLOR,
    strokeStyle: getSvgStrokeStyle(element),
    strokeWidth: stroke ? strokeWidth ?? fallbackStyle.strokeWidth : 0
  };
}

function parseSvgRotation(transform: string | null) {
  const match = transform?.match(
    /rotate\(\s*(-?\d+(?:\.\d+)?)(?:[\s,]+(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?))?/
  );

  if (!match) {
    return { angle: 0, center: null };
  }

  return {
    angle: Number.parseFloat(match[1]) * SVG_RADIANS_PER_DEGREE,
    center:
      match[2] && match[3]
        ? { x: Number.parseFloat(match[2]), y: Number.parseFloat(match[3]) }
        : null
  };
}

function rotatePoint(point: Point, center: Point, angle: number): Point {
  if (angle === 0) {
    return point;
  }

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
}

function getElementCenterPoint(element: KizkattElement) {
  return {
    x: element.x + element.width / VIEWPORT_CENTER_DIVISOR,
    y: element.y + element.height / VIEWPORT_CENTER_DIVISOR
  };
}

function mapSvgPointToElement(
  point: Point,
  sourceElement: KizkattElement,
  viewBox: Bounds
) {
  const mappedPoint = {
    x: sourceElement.x + ((point.x - viewBox.x) / viewBox.width) * sourceElement.width,
    y:
      sourceElement.y +
      ((point.y - viewBox.y) / viewBox.height) * sourceElement.height
  };

  return rotatePoint(mappedPoint, getElementCenterPoint(sourceElement), sourceElement.angle);
}

function mapSvgBoundsToElement(
  bounds: Bounds,
  sourceElement: KizkattElement,
  viewBox: Bounds,
  angle = 0
) {
  const width = (bounds.width / viewBox.width) * sourceElement.width;
  const height = (bounds.height / viewBox.height) * sourceElement.height;
  const center = mapSvgPointToElement(
    {
      x: bounds.x + bounds.width / VIEWPORT_CENTER_DIVISOR,
      y: bounds.y + bounds.height / VIEWPORT_CENTER_DIVISOR
    },
    sourceElement,
    viewBox
  );

  return {
    angle: angle + sourceElement.angle,
    height,
    width,
    x: center.x - width / VIEWPORT_CENTER_DIVISOR,
    y: center.y - height / VIEWPORT_CENTER_DIVISOR
  };
}

function getFittedSvgViewport(sourceElement: KizkattElement, viewBox: Bounds) {
  const scale = Math.min(
    sourceElement.width / viewBox.width,
    sourceElement.height / viewBox.height
  );
  const width = viewBox.width * scale;
  const height = viewBox.height * scale;

  return {
    height,
    scale,
    width,
    x: sourceElement.x + (sourceElement.width - width) / VIEWPORT_CENTER_DIVISOR,
    y: sourceElement.y + (sourceElement.height - height) / VIEWPORT_CENTER_DIVISOR
  };
}

function mapSvgPointToFittedElement(
  point: Point,
  sourceElement: KizkattElement,
  viewBox: Bounds
) {
  const viewport = getFittedSvgViewport(sourceElement, viewBox);
  const mappedPoint = {
    x: viewport.x + (point.x - viewBox.x) * viewport.scale,
    y: viewport.y + (point.y - viewBox.y) * viewport.scale
  };

  return rotatePoint(mappedPoint, getElementCenterPoint(sourceElement), sourceElement.angle);
}

function mapSvgBoundsToFittedElement(
  bounds: Bounds,
  sourceElement: KizkattElement,
  viewBox: Bounds,
  angle = 0
) {
  const viewport = getFittedSvgViewport(sourceElement, viewBox);
  const width = bounds.width * viewport.scale;
  const height = bounds.height * viewport.scale;
  const center = mapSvgPointToFittedElement(
    {
      x: bounds.x + bounds.width / VIEWPORT_CENTER_DIVISOR,
      y: bounds.y + bounds.height / VIEWPORT_CENTER_DIVISOR
    },
    sourceElement,
    viewBox
  );

  return {
    angle: angle + sourceElement.angle,
    height,
    width,
    x: center.x - width / VIEWPORT_CENTER_DIVISOR,
    y: center.y - height / VIEWPORT_CENTER_DIVISOR
  };
}

function getPrimarySvgShape(group: Element, selector: string) {
  return Array.from(group.querySelectorAll(selector)).find(
    (element) => !element.hasAttribute("data-sloppiness-stroke")
  );
}

function parseSvgPoints(value: string | null) {
  if (!value) {
    return [];
  }

  const values = value
    .trim()
    .split(/[\s,]+/)
    .map((part) => Number.parseFloat(part));
  const points: Point[] = [];

  for (let index = 0; index < values.length - 1; index += 2) {
    if (Number.isFinite(values[index]) && Number.isFinite(values[index + 1])) {
      points.push({ x: values[index], y: values[index + 1] });
    }
  }

  return points;
}

function getPointsBounds(points: Point[]) {
  if (points.length === 0) {
    return null;
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    height: maxY - minY,
    width: maxX - minX,
    x: minX,
    y: minY
  };
}

type SvgTransformMatrix = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

const SVG_IDENTITY_TRANSFORM_MATRIX: SvgTransformMatrix = {
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0
};

function multiplySvgTransformMatrices(
  left: SvgTransformMatrix,
  right: SvgTransformMatrix
): SvgTransformMatrix {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f
  };
}

function applySvgTransformMatrix(
  matrix: SvgTransformMatrix,
  point: Point
): Point {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f
  };
}

function parseSvgTransformArguments(value: string) {
  return value
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((part) => Number.parseFloat(part))
    .filter(Number.isFinite);
}

function getSvgTranslateMatrix(tx: number, ty = 0): SvgTransformMatrix {
  return { ...SVG_IDENTITY_TRANSFORM_MATRIX, e: tx, f: ty };
}

function getSvgScaleMatrix(sx: number, sy = sx): SvgTransformMatrix {
  return { ...SVG_IDENTITY_TRANSFORM_MATRIX, a: sx, d: sy };
}

function getSvgRotateMatrix(
  angle: number,
  centerX?: number,
  centerY?: number
): SvgTransformMatrix {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rotateMatrix = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };

  if (centerX === undefined || centerY === undefined) {
    return rotateMatrix;
  }

  return multiplySvgTransformMatrices(
    multiplySvgTransformMatrices(
      getSvgTranslateMatrix(centerX, centerY),
      rotateMatrix
    ),
    getSvgTranslateMatrix(-centerX, -centerY)
  );
}

function parseSvgTransformMatrix(transform: string | null): SvgTransformMatrix {
  if (!transform) {
    return SVG_IDENTITY_TRANSFORM_MATRIX;
  }

  return Array.from(transform.matchAll(SVG_TRANSFORM_FUNCTION_PATTERN)).reduce(
    (matrix, match) => {
      const type = match[1].toLowerCase();
      const values = parseSvgTransformArguments(match[2]);
      let nextMatrix: SvgTransformMatrix | null = null;

      if (type === "matrix" && values.length >= 6) {
        nextMatrix = {
          a: values[0],
          b: values[1],
          c: values[2],
          d: values[3],
          e: values[4],
          f: values[5]
        };
      } else if (type === "translate" && values.length >= 1) {
        nextMatrix = getSvgTranslateMatrix(values[0], values[1] ?? 0);
      } else if (type === "scale" && values.length >= 1) {
        nextMatrix = getSvgScaleMatrix(values[0], values[1] ?? values[0]);
      } else if (type === "rotate" && values.length >= 1) {
        nextMatrix = getSvgRotateMatrix(
          values[0] * SVG_RADIANS_PER_DEGREE,
          values[1],
          values[2]
        );
      } else if (type === "skewx" && values.length >= 1) {
        nextMatrix = {
          ...SVG_IDENTITY_TRANSFORM_MATRIX,
          c: Math.tan(values[0] * SVG_RADIANS_PER_DEGREE)
        };
      } else if (type === "skewy" && values.length >= 1) {
        nextMatrix = {
          ...SVG_IDENTITY_TRANSFORM_MATRIX,
          b: Math.tan(values[0] * SVG_RADIANS_PER_DEGREE)
        };
      }

      return nextMatrix
        ? multiplySvgTransformMatrices(matrix, nextMatrix)
        : matrix;
    },
    SVG_IDENTITY_TRANSFORM_MATRIX
  );
}

function getSvgElementTransformMatrix(
  element: Element,
  root: SVGSVGElement
): SvgTransformMatrix {
  const elements: Element[] = [];
  let currentElement: Element | null = element;

  while (currentElement) {
    elements.unshift(currentElement);

    if (currentElement === root) {
      break;
    }

    currentElement = currentElement.parentElement;
  }

  return elements.reduce(
    (matrix, current) =>
      multiplySvgTransformMatrices(
        matrix,
        parseSvgTransformMatrix(current.getAttribute("transform"))
      ),
    SVG_IDENTITY_TRANSFORM_MATRIX
  );
}

function isAxisAlignedSvgTransform(matrix: SvgTransformMatrix) {
  return (
    Math.abs(matrix.b) <= SVG_TRANSFORM_EPSILON &&
    Math.abs(matrix.c) <= SVG_TRANSFORM_EPSILON
  );
}

function getSvgMatrixScale(matrix: SvgTransformMatrix) {
  return {
    x: Math.hypot(matrix.a, matrix.b) || 1,
    y: Math.hypot(matrix.c, matrix.d) || 1
  };
}

function mapGenericSvgPointToElement(
  point: Point,
  matrix: SvgTransformMatrix,
  sourceElement: KizkattElement,
  viewBox: Bounds
) {
  return mapSvgPointToFittedElement(
    applySvgTransformMatrix(matrix, point),
    sourceElement,
    viewBox
  );
}

function getTransformedSvgBounds(points: Point[], matrix: SvgTransformMatrix) {
  return getPointsBounds(points.map((point) => applySvgTransformMatrix(matrix, point)));
}

function formatImportedPathNumber(value: number) {
  const normalizedValue = Object.is(value, -0) ? 0 : value;
  const roundedValue = Number(normalizedValue.toFixed(3));

  return Number.isInteger(roundedValue) ? `${roundedValue}` : `${roundedValue}`;
}

function getPathDataFromPoints(points: Point[], closed = false) {
  return points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";

      return `${command} ${formatImportedPathNumber(point.x)} ${formatImportedPathNumber(
        point.y
      )}`;
    })
    .concat(closed ? "Z" : [])
    .join(" ");
}

function getRectPathData(x: number, y: number, width: number, height: number) {
  return getPathDataFromPoints(
    [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height }
    ],
    true
  );
}

function getEllipsePathData(cx: number, cy: number, rx: number, ry: number) {
  const ox = rx * SVG_ELLIPSE_PATH_KAPPA;
  const oy = ry * SVG_ELLIPSE_PATH_KAPPA;

  return [
    `M ${formatImportedPathNumber(cx - rx)} ${formatImportedPathNumber(cy)}`,
    `C ${formatImportedPathNumber(cx - rx)} ${formatImportedPathNumber(
      cy - oy
    )} ${formatImportedPathNumber(cx - ox)} ${formatImportedPathNumber(
      cy - ry
    )} ${formatImportedPathNumber(cx)} ${formatImportedPathNumber(cy - ry)}`,
    `C ${formatImportedPathNumber(cx + ox)} ${formatImportedPathNumber(
      cy - ry
    )} ${formatImportedPathNumber(cx + rx)} ${formatImportedPathNumber(
      cy - oy
    )} ${formatImportedPathNumber(cx + rx)} ${formatImportedPathNumber(cy)}`,
    `C ${formatImportedPathNumber(cx + rx)} ${formatImportedPathNumber(
      cy + oy
    )} ${formatImportedPathNumber(cx + ox)} ${formatImportedPathNumber(
      cy + ry
    )} ${formatImportedPathNumber(cx)} ${formatImportedPathNumber(cy + ry)}`,
    `C ${formatImportedPathNumber(cx - ox)} ${formatImportedPathNumber(
      cy + ry
    )} ${formatImportedPathNumber(cx - rx)} ${formatImportedPathNumber(
      cy + oy
    )} ${formatImportedPathNumber(cx - rx)} ${formatImportedPathNumber(cy)}`,
    "Z"
  ].join(" ");
}

function isHiddenGenericSvgElement(element: Element) {
  const display = getInheritedSvgAttribute(element, "display");
  const visibility = getInheritedSvgAttribute(element, "visibility");
  const stroke = getInheritedSvgAttribute(element, "stroke")?.trim().toLowerCase();
  const fill = getInheritedSvgAttribute(element, "fill")?.trim().toLowerCase();

  return (
    Boolean(element.closest("defs, clipPath, mask, marker, pattern, symbol")) ||
    display === "none" ||
    visibility === "hidden" ||
    ((stroke === "none" || !stroke) && fill === "none")
  );
}

function getGenericSvgElementStyle(
  root: SVGSVGElement,
  element: Element,
  fallbackStyle: StyleState,
  sourceElement: KizkattElement,
  viewBox: Bounds,
  matrix: SvgTransformMatrix
) {
  const rawStyle = getSvgElementStyle(root, element, fallbackStyle);
  const matrixScale = getSvgMatrixScale(matrix);
  const viewport = getFittedSvgViewport(sourceElement, viewBox);
  const strokeScale =
    (viewport.scale * (matrixScale.x + matrixScale.y)) / VIEWPORT_CENTER_DIVISOR;

  if (sourceElement.svgUseElementStyle !== true) {
    return {
      ...rawStyle,
      strokeWidth: rawStyle.strokeWidth * strokeScale
    };
  }

  const hasStroke =
    rawStyle.strokeColor !== TRANSPARENT_COLOR && rawStyle.strokeWidth > 0;
  const hasFill = rawStyle.backgroundColor !== TRANSPARENT_COLOR;

  return {
    ...rawStyle,
    backgroundColor:
      hasFill && sourceElement.backgroundColor !== TRANSPARENT_COLOR
        ? sourceElement.backgroundColor
        : rawStyle.backgroundColor,
    fillStyle: sourceElement.fillStyle ?? rawStyle.fillStyle,
    fillWeight: sourceElement.fillWeight ?? rawStyle.fillWeight,
    opacity: (rawStyle.opacity * sourceElement.opacity) / PERCENT_MAX_VALUE,
    sloppiness: sourceElement.sloppiness ?? rawStyle.sloppiness,
    sloppinessGap: sourceElement.sloppinessGap ?? rawStyle.sloppinessGap,
    strokeColor: hasStroke ? sourceElement.strokeColor : TRANSPARENT_COLOR,
    strokeStyle: sourceElement.strokeStyle,
    strokeWidth: hasStroke ? sourceElement.strokeWidth * strokeScale : 0
  };
}

function createImportedGenericDrawElement(
  style: StyleState,
  canvasPathData: string,
  canvasPathPoints: Point[],
  closed: boolean,
  existingElements: KizkattElement[],
  importedElements: KizkattElement[],
  naming?: ElementNamingConfig
) {
  const bounds = getPointsBounds(canvasPathPoints);

  if (!bounds) {
    return null;
  }

  const localPath = transformSvgPathData(canvasPathData, {
    transformPoint: (point) => ({
      x: point.x - bounds.x,
      y: point.y - bounds.y
    })
  });

  if (!localPath) {
    return null;
  }

  return {
    ...style,
    angle: 0,
    closed,
    height: Math.max(MIN_ELEMENT_SIZE, bounds.height),
    id: createId(),
    name: getImportedElementName(
      "draw",
      existingElements,
      importedElements,
      naming
    ),
    pathData: localPath.pathData,
    points: canvasPathPoints.map((point) => ({
      x: point.x - bounds.x,
      y: point.y - bounds.y
    })),
    type: "draw" as const,
    width: Math.max(MIN_ELEMENT_SIZE, bounds.width),
    x: bounds.x,
    y: bounds.y
  };
}

function createImportedGenericDrawElementFromSvgPath(
  root: SVGSVGElement,
  shape: Element,
  svgPathData: string,
  matrix: SvgTransformMatrix,
  sourceElement: KizkattElement,
  viewBox: Bounds,
  closed: boolean,
  existingElements: KizkattElement[],
  importedElements: KizkattElement[],
  fallbackStyle: StyleState,
  naming?: ElementNamingConfig
) {
  const matrixScale = getSvgMatrixScale(matrix);
  const viewport = getFittedSvgViewport(sourceElement, viewBox);
  const canvasPath = transformSvgPathData(svgPathData, {
    transformArcRadii: (radii) => ({
      rx: radii.rx * matrixScale.x * viewport.scale,
      ry: radii.ry * matrixScale.y * viewport.scale
    }),
    transformPoint: (point) =>
      mapGenericSvgPointToElement(point, matrix, sourceElement, viewBox)
  });

  if (!canvasPath) {
    return null;
  }

  return createImportedGenericDrawElement(
    getGenericSvgElementStyle(
      root,
      shape,
      fallbackStyle,
      sourceElement,
      viewBox,
      matrix
    ),
    canvasPath.pathData,
    canvasPath.points,
    closed || canvasPath.closed,
    existingElements,
    importedElements,
    naming
  );
}

function createImportedGenericNativeElement(
  type: KizkattElement["type"],
  root: SVGSVGElement,
  shape: Element,
  geometry: Bounds,
  sourceElement: KizkattElement,
  viewBox: Bounds,
  existingElements: KizkattElement[],
  importedElements: KizkattElement[],
  fallbackStyle: StyleState,
  naming?: ElementNamingConfig
) {
  return normalizeElement({
    ...mapSvgBoundsToFittedElement(geometry, sourceElement, viewBox),
    ...getGenericSvgElementStyle(
      root,
      shape,
      fallbackStyle,
      sourceElement,
      viewBox,
      getSvgElementTransformMatrix(shape, root)
    ),
    edgeStyle:
      type === "rectangle" && (getSvgNumber(shape, "rx") ?? 0) <= 0
        ? "sharp"
        : "round",
    id: createId(),
    name: getImportedElementName(type, existingElements, importedElements, naming),
    type
  });
}

function createImportedGenericRectElement(
  root: SVGSVGElement,
  rect: Element,
  sourceElement: KizkattElement,
  viewBox: Bounds,
  existingElements: KizkattElement[],
  importedElements: KizkattElement[],
  fallbackStyle: StyleState,
  naming?: ElementNamingConfig
) {
  const x = parseSvgNumber(rect.getAttribute("x")) ?? 0;
  const y = parseSvgNumber(rect.getAttribute("y")) ?? 0;
  const width = getSvgNumber(rect, "width");
  const height = getSvgNumber(rect, "height");

  if (!width || !height) {
    return null;
  }

  const matrix = getSvgElementTransformMatrix(rect, root);
  const corners = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height }
  ];
  const transformedBounds = getTransformedSvgBounds(corners, matrix);

  if (!transformedBounds) {
    return null;
  }

  if (isAxisAlignedSvgTransform(matrix)) {
    return createImportedGenericNativeElement(
      "rectangle",
      root,
      rect,
      transformedBounds,
      sourceElement,
      viewBox,
      existingElements,
      importedElements,
      fallbackStyle,
      naming
    );
  }

  return createImportedGenericDrawElementFromSvgPath(
    root,
    rect,
    getRectPathData(x, y, width, height),
    matrix,
    sourceElement,
    viewBox,
    true,
    existingElements,
    importedElements,
    fallbackStyle,
    naming
  );
}

function createImportedGenericEllipseElement(
  root: SVGSVGElement,
  ellipse: Element,
  sourceElement: KizkattElement,
  viewBox: Bounds,
  existingElements: KizkattElement[],
  importedElements: KizkattElement[],
  fallbackStyle: StyleState,
  naming?: ElementNamingConfig
) {
  const tagName = ellipse.tagName.toLowerCase();
  const cx = parseSvgNumber(ellipse.getAttribute("cx")) ?? 0;
  const cy = parseSvgNumber(ellipse.getAttribute("cy")) ?? 0;
  const rx =
    tagName === "circle"
      ? getSvgNumber(ellipse, "r")
      : getSvgNumber(ellipse, "rx");
  const ry =
    tagName === "circle"
      ? getSvgNumber(ellipse, "r")
      : getSvgNumber(ellipse, "ry");

  if (!rx || !ry) {
    return null;
  }

  const matrix = getSvgElementTransformMatrix(ellipse, root);
  const corners = [
    { x: cx - rx, y: cy - ry },
    { x: cx + rx, y: cy - ry },
    { x: cx + rx, y: cy + ry },
    { x: cx - rx, y: cy + ry }
  ];
  const transformedBounds = getTransformedSvgBounds(corners, matrix);

  if (!transformedBounds) {
    return null;
  }

  if (isAxisAlignedSvgTransform(matrix)) {
    return createImportedGenericNativeElement(
      "ellipse",
      root,
      ellipse,
      transformedBounds,
      sourceElement,
      viewBox,
      existingElements,
      importedElements,
      fallbackStyle,
      naming
    );
  }

  return createImportedGenericDrawElementFromSvgPath(
    root,
    ellipse,
    getEllipsePathData(cx, cy, rx, ry),
    matrix,
    sourceElement,
    viewBox,
    true,
    existingElements,
    importedElements,
    fallbackStyle,
    naming
  );
}

function createImportedGenericLineElement(
  root: SVGSVGElement,
  line: Element,
  sourceElement: KizkattElement,
  viewBox: Bounds,
  existingElements: KizkattElement[],
  importedElements: KizkattElement[],
  fallbackStyle: StyleState,
  naming?: ElementNamingConfig
) {
  const x1 = parseSvgNumber(line.getAttribute("x1"));
  const y1 = parseSvgNumber(line.getAttribute("y1"));
  const x2 = parseSvgNumber(line.getAttribute("x2"));
  const y2 = parseSvgNumber(line.getAttribute("y2"));

  if (x1 === null || y1 === null || x2 === null || y2 === null) {
    return null;
  }

  const matrix = getSvgElementTransformMatrix(line, root);
  const start = mapGenericSvgPointToElement(
    { x: x1, y: y1 },
    matrix,
    sourceElement,
    viewBox
  );
  const end = mapGenericSvgPointToElement(
    { x: x2, y: y2 },
    matrix,
    sourceElement,
    viewBox
  );

  return normalizeElement({
    ...getGenericSvgElementStyle(
      root,
      line,
      fallbackStyle,
      sourceElement,
      viewBox,
      matrix
    ),
    angle: 0,
    edgeStyle: "round",
    height: end.y - start.y,
    id: createId(),
    name: getImportedElementName(
      "line",
      existingElements,
      importedElements,
      naming
    ),
    type: "line",
    width: end.x - start.x,
    x: start.x,
    y: start.y
  });
}

function createImportedGenericPolylineElement(
  root: SVGSVGElement,
  polyline: Element,
  sourceElement: KizkattElement,
  viewBox: Bounds,
  existingElements: KizkattElement[],
  importedElements: KizkattElement[],
  fallbackStyle: StyleState,
  naming?: ElementNamingConfig
) {
  const points = parseSvgPoints(polyline.getAttribute("points"));
  const closed = polyline.tagName.toLowerCase() === "polygon";

  if (points.length < 2) {
    return null;
  }

  const matrix = getSvgElementTransformMatrix(polyline, root);
  const canvasPoints = points.map((point) =>
    mapGenericSvgPointToElement(point, matrix, sourceElement, viewBox)
  );

  return createImportedGenericDrawElement(
    getGenericSvgElementStyle(
      root,
      polyline,
      fallbackStyle,
      sourceElement,
      viewBox,
      matrix
    ),
    getPathDataFromPoints(canvasPoints, closed),
    canvasPoints,
    closed,
    existingElements,
    importedElements,
    naming
  );
}

function createImportedGenericPathElement(
  root: SVGSVGElement,
  path: Element,
  sourceElement: KizkattElement,
  viewBox: Bounds,
  existingElements: KizkattElement[],
  importedElements: KizkattElement[],
  fallbackStyle: StyleState,
  naming?: ElementNamingConfig
) {
  const pathData = path.getAttribute("d");

  if (!pathData) {
    return null;
  }

  return createImportedGenericDrawElementFromSvgPath(
    root,
    path,
    pathData,
    getSvgElementTransformMatrix(path, root),
    sourceElement,
    viewBox,
    false,
    existingElements,
    importedElements,
    fallbackStyle,
    naming
  );
}

function createImportedGenericImageElement(
  root: SVGSVGElement,
  image: Element,
  sourceElement: KizkattElement,
  viewBox: Bounds,
  existingElements: KizkattElement[],
  importedElements: KizkattElement[],
  fallbackStyle: StyleState,
  naming?: ElementNamingConfig
) {
  const x = parseSvgNumber(image.getAttribute("x")) ?? 0;
  const y = parseSvgNumber(image.getAttribute("y")) ?? 0;
  const width = getSvgNumber(image, "width");
  const height = getSvgNumber(image, "height");
  const href =
    image.getAttribute("href") ?? image.getAttribute("xlink:href") ?? undefined;

  if (!width || !height || !href) {
    return null;
  }

  const matrix = getSvgElementTransformMatrix(image, root);
  const transformedBounds = getTransformedSvgBounds(
    [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height }
    ],
    matrix
  );

  if (!transformedBounds) {
    return null;
  }

  return normalizeElement({
    ...mapSvgBoundsToFittedElement(transformedBounds, sourceElement, viewBox),
    ...getGenericSvgElementStyle(
      root,
      image,
      fallbackStyle,
      sourceElement,
      viewBox,
      matrix
    ),
    backgroundColor: TRANSPARENT_COLOR,
    id: createId(),
    name: getImportedElementName(
      "image",
      existingElements,
      importedElements,
      naming
    ),
    src: href,
    type: "image"
  });
}

function createImportedGenericTextElement(
  root: SVGSVGElement,
  text: Element,
  sourceElement: KizkattElement,
  viewBox: Bounds,
  existingElements: KizkattElement[],
  importedElements: KizkattElement[],
  fallbackStyle: StyleState,
  naming?: ElementNamingConfig
) {
  const x = parseSvgNumber(text.getAttribute("x")) ?? 0;
  const y = parseSvgNumber(text.getAttribute("y")) ?? 0;
  const matrix = getSvgElementTransformMatrix(text, root);
  const point = mapGenericSvgPointToElement({ x, y }, matrix, sourceElement, viewBox);

  return normalizeElement({
    ...getGenericSvgElementStyle(
      root,
      text,
      fallbackStyle,
      sourceElement,
      viewBox,
      matrix
    ),
    angle: 0,
    height: TEXT_ELEMENT_DEFAULT_HEIGHT,
    id: createId(),
    name: getImportedElementName(
      "text",
      existingElements,
      importedElements,
      naming
    ),
    text: text.textContent ?? "",
    type: "text",
    width: TEXT_ELEMENT_DEFAULT_WIDTH,
    x: point.x,
    y: point.y - TEXT_ELEMENT_DEFAULT_HEIGHT
  });
}

function createImportedGenericElement(
  root: SVGSVGElement,
  shape: Element,
  sourceElement: KizkattElement,
  viewBox: Bounds,
  existingElements: KizkattElement[],
  importedElements: KizkattElement[],
  fallbackStyle: StyleState,
  naming?: ElementNamingConfig
) {
  const tagName = shape.tagName.toLowerCase();

  if (tagName === "rect") {
    return createImportedGenericRectElement(
      root,
      shape,
      sourceElement,
      viewBox,
      existingElements,
      importedElements,
      fallbackStyle,
      naming
    );
  }

  if (tagName === "circle" || tagName === "ellipse") {
    return createImportedGenericEllipseElement(
      root,
      shape,
      sourceElement,
      viewBox,
      existingElements,
      importedElements,
      fallbackStyle,
      naming
    );
  }

  if (tagName === "line") {
    return createImportedGenericLineElement(
      root,
      shape,
      sourceElement,
      viewBox,
      existingElements,
      importedElements,
      fallbackStyle,
      naming
    );
  }

  if (tagName === "polyline" || tagName === "polygon") {
    return createImportedGenericPolylineElement(
      root,
      shape,
      sourceElement,
      viewBox,
      existingElements,
      importedElements,
      fallbackStyle,
      naming
    );
  }

  if (tagName === "path") {
    return createImportedGenericPathElement(
      root,
      shape,
      sourceElement,
      viewBox,
      existingElements,
      importedElements,
      fallbackStyle,
      naming
    );
  }

  if (tagName === "image") {
    return createImportedGenericImageElement(
      root,
      shape,
      sourceElement,
      viewBox,
      existingElements,
      importedElements,
      fallbackStyle,
      naming
    );
  }

  if (tagName === "text") {
    return createImportedGenericTextElement(
      root,
      shape,
      sourceElement,
      viewBox,
      existingElements,
      importedElements,
      fallbackStyle,
      naming
    );
  }

  return null;
}

function breakApartGenericSvgElement(
  root: SVGSVGElement,
  sourceElement: KizkattElement,
  viewBox: Bounds,
  existingElements: KizkattElement[],
  fallbackStyle: StyleState,
  naming?: ElementNamingConfig
) {
  const importedElements: KizkattElement[] = [];
  const shapes = Array.from(
    root.querySelectorAll(SVG_GENERIC_GRAPHIC_ELEMENT_SELECTOR)
  ).filter((shape) => !isHiddenGenericSvgElement(shape));

  shapes.forEach((shape) => {
    const importedElement = createImportedGenericElement(
      root,
      shape,
      sourceElement,
      viewBox,
      existingElements,
      importedElements,
      fallbackStyle,
      naming
    );

    if (importedElement) {
      importedElements.push(importedElement);
    }
  });

  return importedElements;
}

function getElementTypeFromSvgGroup(group: Element) {
  const type = group.getAttribute("data-element-type");

  return type && SVG_IMPORT_ELEMENT_TYPES.has(type) ? type : null;
}

function getImportedElementName(
  type: KizkattElement["type"],
  existingElements: KizkattElement[],
  importedElements: KizkattElement[],
  naming?: ElementNamingConfig
) {
  return buildElementName(type, [...existingElements, ...importedElements], naming);
}

function getImportedGroup(
  group: Element,
  groupIdMap: Map<string, string>,
  createGroupId: () => string
) {
  const oldGroupId = group.getAttribute("data-group-id");

  if (!oldGroupId) {
    return {};
  }

  const groupId = groupIdMap.get(oldGroupId) ?? createGroupId();
  groupIdMap.set(oldGroupId, groupId);

  return {
    groupId,
    groupName: group.getAttribute("data-group-name") ?? undefined
  };
}

function createImportedElement(
  type: KizkattElement["type"],
  group: Element,
  shape: Element,
  geometry: Bounds & { angle?: number },
  sourceElement: KizkattElement,
  viewBox: Bounds,
  existingElements: KizkattElement[],
  importedElements: KizkattElement[],
  groupIdMap: Map<string, string>,
  fallbackStyle: StyleState,
  naming?: ElementNamingConfig
) {
  return normalizeElement({
    ...mapSvgBoundsToElement(geometry, sourceElement, viewBox, geometry.angle),
    ...getSvgElementStyle(group, shape, fallbackStyle),
    ...getImportedGroup(group, groupIdMap, createId),
    edgeStyle:
      type === "rectangle" && (getSvgNumber(shape, "rx") ?? 0) <= 0
        ? "sharp"
        : "round",
    id: createId(),
    name: getImportedElementName(type, existingElements, importedElements, naming),
    type
  });
}

function getSvgGroupGeometry(group: Element, type: KizkattElement["type"]) {
  const rotation = parseSvgRotation(group.getAttribute("transform"));

  if (type === "rectangle") {
    const rect = getPrimarySvgShape(group, "rect");

    if (!rect) {
      return null;
    }

    const x = getSvgNumber(rect, "x") ?? 0;
    const y = getSvgNumber(rect, "y") ?? 0;
    const width = getSvgNumber(rect, "width");
    const height = getSvgNumber(rect, "height");

    return width && height
      ? { geometry: { angle: rotation.angle, height, width, x, y }, shape: rect }
      : null;
  }

  if (type === "ellipse") {
    const ellipse = getPrimarySvgShape(group, "ellipse");

    if (!ellipse) {
      return null;
    }

    const cx = getSvgNumber(ellipse, "cx");
    const cy = getSvgNumber(ellipse, "cy");
    const rx = getSvgNumber(ellipse, "rx");
    const ry = getSvgNumber(ellipse, "ry");

    return cx !== null && cy !== null && rx && ry
      ? {
          geometry: {
            angle: rotation.angle,
            height: ry * VIEWPORT_CENTER_DIVISOR,
            width: rx * VIEWPORT_CENTER_DIVISOR,
            x: cx - rx,
            y: cy - ry
          },
          shape: ellipse
        }
      : null;
  }

  if (type === "diamond") {
    const polygon = getPrimarySvgShape(group, "polygon");
    const bounds = getPointsBounds(parseSvgPoints(polygon?.getAttribute("points") ?? null));

    return polygon && bounds
      ? { geometry: { ...bounds, angle: rotation.angle }, shape: polygon }
      : null;
  }

  if (type === "image") {
    const image = getPrimarySvgShape(group, "image");
    const nestedSvg = getPrimarySvgShape(group, "svg");
    const shape = image ?? nestedSvg;

    if (!shape) {
      return null;
    }

    const x = getSvgNumber(shape, "x") ?? 0;
    const y = getSvgNumber(shape, "y") ?? 0;
    const width = getSvgNumber(shape, "width");
    const height = getSvgNumber(shape, "height");

    return width && height
      ? { geometry: { angle: rotation.angle, height, width, x, y }, shape }
      : null;
  }

  return null;
}

function createImportedLinearElement(
  type: "line" | "arrow",
  group: Element,
  sourceElement: KizkattElement,
  viewBox: Bounds,
  existingElements: KizkattElement[],
  importedElements: KizkattElement[],
  groupIdMap: Map<string, string>,
  fallbackStyle: StyleState,
  naming?: ElementNamingConfig
) {
  const line = getPrimarySvgShape(group, "line");

  if (!line) {
    return null;
  }

  const x1 = getSvgNumber(line, "x1");
  const y1 = getSvgNumber(line, "y1");
  const x2 = getSvgNumber(line, "x2");
  const y2 = getSvgNumber(line, "y2");

  if (x1 === null || y1 === null || x2 === null || y2 === null) {
    return null;
  }

  const rotation = parseSvgRotation(group.getAttribute("transform"));
  const fallbackCenter = {
    x: (x1 + x2) / VIEWPORT_CENTER_DIVISOR,
    y: (y1 + y2) / VIEWPORT_CENTER_DIVISOR
  };
  const start = mapSvgPointToElement(
    rotatePoint({ x: x1, y: y1 }, rotation.center ?? fallbackCenter, rotation.angle),
    sourceElement,
    viewBox
  );
  const end = mapSvgPointToElement(
    rotatePoint({ x: x2, y: y2 }, rotation.center ?? fallbackCenter, rotation.angle),
    sourceElement,
    viewBox
  );

  return normalizeElement({
    ...getSvgElementStyle(group, line, fallbackStyle),
    ...getImportedGroup(group, groupIdMap, createId),
    edgeStyle: "round",
    height: end.y - start.y,
    id: createId(),
    name: getImportedElementName(type, existingElements, importedElements, naming),
    type,
    width: end.x - start.x,
    x: start.x,
    y: start.y,
    angle: 0
  });
}

function createImportedImageElement(
  group: Element,
  shape: Element,
  geometry: Bounds & { angle?: number },
  sourceElement: KizkattElement,
  viewBox: Bounds,
  existingElements: KizkattElement[],
  importedElements: KizkattElement[],
  groupIdMap: Map<string, string>,
  fallbackStyle: StyleState,
  naming?: ElementNamingConfig
) {
  const mappedGeometry = mapSvgBoundsToElement(
    geometry,
    sourceElement,
    viewBox,
    geometry.angle
  );
  const href =
    shape.getAttribute("href") ?? shape.getAttribute("xlink:href") ?? undefined;
  const nestedSvg = shape.tagName.toLowerCase() === "svg" ? (shape as SVGSVGElement) : null;

  return normalizeElement({
    ...mappedGeometry,
    ...getSvgElementStyle(group, shape, fallbackStyle),
    ...getImportedGroup(group, groupIdMap, createId),
    backgroundColor: TRANSPARENT_COLOR,
    id: createId(),
    name: getImportedElementName("image", existingElements, importedElements, naming),
    src: href,
    svgContent: nestedSvg ? nestedSvg.innerHTML : undefined,
    svgUseElementStyle: nestedSvg
      ? nestedSvg.classList.contains("is-style-editing")
      : undefined,
    svgViewBox: nestedSvg?.getAttribute("viewBox") ?? undefined,
    type: "image"
  });
}

function createImportedTextElement(
  group: Element,
  sourceElement: KizkattElement,
  viewBox: Bounds,
  existingElements: KizkattElement[],
  importedElements: KizkattElement[],
  groupIdMap: Map<string, string>,
  fallbackStyle: StyleState,
  naming?: ElementNamingConfig
) {
  const text = getPrimarySvgShape(group, "text");

  if (!text) {
    return null;
  }

  const x = getSvgNumber(text, "x") ?? 0;
  const y = getSvgNumber(text, "y") ?? 0;
  const point = mapSvgPointToElement({ x, y }, sourceElement, viewBox);

  return normalizeElement({
    ...getSvgElementStyle(group, text, fallbackStyle),
    ...getImportedGroup(group, groupIdMap, createId),
    angle: sourceElement.angle,
    height: TEXT_ELEMENT_DEFAULT_HEIGHT,
    id: createId(),
    name: getImportedElementName("text", existingElements, importedElements, naming),
    text: text.textContent ?? "",
    type: "text",
    width: TEXT_ELEMENT_DEFAULT_WIDTH,
    x: point.x,
    y: point.y - TEXT_ELEMENT_DEFAULT_HEIGHT
  });
}

function breakApartSvgElement(
  sourceElement: KizkattElement,
  existingElements: KizkattElement[],
  fallbackStyle: StyleState,
  naming?: ElementNamingConfig
) {
  const svgCode = getBreakApartSvgCode(sourceElement);

  if (!svgCode) {
    return [];
  }

  const document = parseSvgDocument(svgCode);
  const root = getSvgRoot(document);

  if (!root || document.querySelector("parsererror")) {
    return [];
  }

  const viewBox = parseSvgViewBox(root.getAttribute("viewBox")) ?? {
    height: sourceElement.height,
    width: sourceElement.width,
    x: 0,
    y: 0
  };
  const groups = Array.from(root.querySelectorAll("[data-element-id]")).filter(
    (group) => !group.parentElement?.closest("[data-element-id]")
  );
  const importedElements: KizkattElement[] = [];
  const groupIdMap = new Map<string, string>();

  groups.forEach((group) => {
    const type = getElementTypeFromSvgGroup(group);

    if (!type || type === "draw") {
      return;
    }

    if (type === "line" || type === "arrow") {
      const importedLinearElement = createImportedLinearElement(
        type,
        group,
        sourceElement,
        viewBox,
        existingElements,
        importedElements,
        groupIdMap,
        fallbackStyle,
        naming
      );

      if (importedLinearElement) {
        importedElements.push(importedLinearElement);
      }
      return;
    }

    if (type === "text") {
      const importedTextElement = createImportedTextElement(
        group,
        sourceElement,
        viewBox,
        existingElements,
        importedElements,
        groupIdMap,
        fallbackStyle,
        naming
      );

      if (importedTextElement) {
        importedElements.push(importedTextElement);
      }
      return;
    }

    const geometry = getSvgGroupGeometry(group, type);

    if (!geometry) {
      return;
    }

    if (type === "image") {
      importedElements.push(
        createImportedImageElement(
          group,
          geometry.shape,
          geometry.geometry,
          sourceElement,
          viewBox,
          existingElements,
          importedElements,
          groupIdMap,
          fallbackStyle,
          naming
        )
      );
      return;
    }

    importedElements.push(
      createImportedElement(
        type,
        group,
        geometry.shape,
        geometry.geometry,
        sourceElement,
        viewBox,
        existingElements,
        importedElements,
        groupIdMap,
        fallbackStyle,
        naming
      )
    );
  });

  if (root.classList.contains("kizkatt-canvas") || groups.length > 0) {
    return importedElements;
  }

  return breakApartGenericSvgElement(
    root,
    sourceElement,
    viewBox,
    existingElements,
    fallbackStyle,
    naming
  );
}

function inflateBounds(bounds: Bounds, padding: number) {
  return {
    height: bounds.height + padding * VIEWPORT_CENTER_DIVISOR,
    width: bounds.width + padding * VIEWPORT_CENTER_DIVISOR,
    x: bounds.x - padding,
    y: bounds.y - padding
  };
}

function getExportBounds(elements: KizkattElement[]) {
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

type Size = {
  height: number;
  width: number;
};

type CopiedPngExport = Size & {
  createdAt: number;
};

const COPIED_PNG_EXPORT_SIZE_TTL_MS = 5 * 60 * 1000;

function isExpectedCopiedPngSize(
  naturalWidth: number,
  naturalHeight: number,
  preferredSize: Size
) {
  const pixelRatio = PNG_EXPORT_DPI / SCREEN_DPI;
  const expectedWidth = Math.ceil(preferredSize.width * pixelRatio);
  const expectedHeight = Math.ceil(preferredSize.height * pixelRatio);

  return (
    Math.abs(naturalWidth - expectedWidth) <= MIN_PIXEL_SIZE &&
    Math.abs(naturalHeight - expectedHeight) <= MIN_PIXEL_SIZE
  );
}

export type KizkattRenderElementOptions = {
  overlayVariant?: "primary" | "internal";
  selectedBendIndex?: number;
  showLinearBendHandles?: boolean;
  showRotateHoverIcon?: boolean;
  showRotateHandle?: boolean;
  showSelectionBounds?: boolean;
};

export type ToolbarProps = {
  activeTool: Tool;
  onActivateTool: (tool: Tool) => void;
};

export type CanvasContextMenuProps = {
  arrowBinding: boolean;
  canBreakApart: boolean;
  canCopySelection: boolean;
  canGroup: boolean;
  canUngroup: boolean;
  contextMenu: ContextMenuState | null;
  onCloseAndRun: (action: () => void | Promise<void>) => void;
  onBreakApart: () => void;
  onCopy: () => void;
  onCopyPng: () => Promise<void>;
  onCopySvg: () => Promise<void>;
  onGroup: () => void;
  onPaste: () => void | Promise<void>;
  onPasteSvgCode: () => void | Promise<void>;
  onSelectAll: () => void;
  onUngroup: () => void;
  selectionAreaMode: SelectionAreaMode;
  setArrowBinding: (updater: (value: boolean) => boolean) => void;
  setSelectionAreaMode: (mode: SelectionAreaMode) => void;
  setShowGrid: (updater: (value: boolean) => boolean) => void;
  setSnapToGrid: (updater: (value: boolean) => boolean) => void;
  setSnapToMidpoints: (updater: (value: boolean) => boolean) => void;
  setSnapToObjects: (updater: (value: boolean) => boolean) => void;
  setViewMode: (updater: (value: boolean) => boolean) => void;
  setZenMode: (updater: (value: boolean) => boolean) => void;
  canUseGrid: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  snapToMidpoints: boolean;
  snapToObjects: boolean;
  viewMode: boolean;
  zenMode: boolean;
};

export type MainMenuProps = {
  canvasBackgroundColor: string;
  customCanvasBackgroundColor: string;
  gridColor: string;
  gridSettings: GridSettings;
  menuOpen: boolean;
  onCanvasBackgroundChange: (color: string) => void;
  onExport: () => void;
  onGridColorChange: (color: string) => void;
  onGridSettingsChange: (settings: GridSettings) => void;
  onOpen: () => void;
  onPickCanvasBackground: () => void;
  onMenuOpenChange: (open: boolean) => void;
  onResetCanvas: () => void;
  onThemeChange: (theme: KizkattTheme) => void;
  onUiScaleChange: (scale: number) => void;
  theme: KizkattTheme;
  uiScale: number;
};

export type StylePanelProps = {
  activeTool: Tool;
  canToggleClosedPath: boolean;
  closedPath: boolean;
  onAction: (action: "delete" | "duplicate" | "link") => void;
  onClosedPathChange: (closed: boolean) => void;
  onLayerAction: (action: "back" | "backward" | "forward" | "front") => void;
  onStyleChange: (
    patch: Partial<StyleState>,
    options?: { transient?: boolean }
  ) => void;
  onStyleChangeEnd: () => void;
  selectedElements: KizkattElement[];
  style: StyleState;
  theme: KizkattTheme;
};

export type TextEditorProps = {
  element: KizkattElement;
  onBlur: () => void;
  onChange: (text: string) => void;
  pan: Point;
  zoom: number;
};

export type KizkattGraphicEditorComponents = {
  CanvasContextMenu: ComponentType<CanvasContextMenuProps>;
  CanvasGrid: ComponentType<{
    gridSettings: GridSettings;
    pan: Point;
    visible: boolean;
    zoom: number;
  }>;
  FooterControls: ComponentType<{
    canRedo: boolean;
    canUndo: boolean;
    onRedo: () => void;
    onUndo: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    zoom: number;
  }>;
  MainMenu: ComponentType<MainMenuProps>;
  SelectedBounds: ComponentType<{
    elements: KizkattElement[];
    interaction: Interaction | null;
  }>;
  SelectionArea: ComponentType<{ interaction: Interaction | null }>;
  StylePanel: ComponentType<StylePanelProps>;
  TextEditor: ComponentType<TextEditorProps>;
  Toolbar: ComponentType<ToolbarProps>;
};

export type KizkattGraphicEditorProps = {
  arrowMarkerId?: string;
  boardAriaLabel?: string;
  boardClassName?: string;
  boardThemeClassName?: (theme: KizkattTheme) => string;
  canvasAriaLabel?: string;
  canvasClassName?: string;
  components: KizkattGraphicEditorComponents;
  defaultElementStyleByTheme?: Record<KizkattTheme, StyleState>;
  fileInputClassName?: string;
  imageInputAriaLabel?: string;
  getCanvasCursor: (state: { isPanning: boolean; tool: Tool }) => string;
  renderElement: (
    element: KizkattElement,
    selected: boolean,
    options?: KizkattRenderElementOptions
  ) => ReactNode;
  renderElementOverlay?: (
    element: KizkattElement,
    options?: KizkattRenderElementOptions
  ) => ReactNode;
  serializeSvg: (svg: SVGSVGElement, options?: SvgSerializeOptions) => string;
  naming?: ElementNamingConfig;
  shouldShowStylePanel: (state: {
    activeTool: Tool;
    selectedElements: KizkattElement[];
  }) => boolean;
  getToolForSelectedElement?: (element: KizkattElement) => Tool | null;
};

function isSameStyle(firstStyle: StyleState, secondStyle: StyleState) {
  return (
    firstStyle.backgroundColor === secondStyle.backgroundColor &&
    firstStyle.edgeStyle === secondStyle.edgeStyle &&
    firstStyle.fillStyle === secondStyle.fillStyle &&
    firstStyle.fillWeight === secondStyle.fillWeight &&
    firstStyle.opacity === secondStyle.opacity &&
    firstStyle.sloppiness === secondStyle.sloppiness &&
    firstStyle.sloppinessGap === secondStyle.sloppinessGap &&
    firstStyle.strokeColor === secondStyle.strokeColor &&
    firstStyle.strokeStyle === secondStyle.strokeStyle &&
    firstStyle.strokeWidth === secondStyle.strokeWidth
  );
}

function getActiveInteractionCursor(interaction: Interaction | null) {
  if (!interaction) {
    return null;
  }

  if (interaction.type === "resize") {
    if (!interaction.handle) {
      return "move";
    }

    const selectedIdSet = new Set(interaction.selectedIds);
    const selectedOriginalElements = interaction.originalElements.filter(
      (element) => selectedIdSet.has(element.id)
    );
    const angle =
      selectedOriginalElements.length === SINGLE_SELECTION_COUNT
        ? selectedOriginalElements[0].angle
        : 0;

    return getResizeCursor(angle, interaction.handle);
  }

  if (
    interaction.type === "bend" ||
    interaction.type === "move" ||
    interaction.type === "rotate"
  ) {
    return "grabbing";
  }

  return null;
}

export function KizkattGraphicEditor({
  arrowMarkerId = DEFAULT_ARROW_MARKER_ID,
  boardAriaLabel = DEFAULT_BOARD_ARIA_LABEL,
  boardClassName = "kizkatt-board",
  boardThemeClassName = (theme) => `kizkatt-board--${theme}`,
  canvasAriaLabel = DEFAULT_CANVAS_ARIA_LABEL,
  canvasClassName = "kizkatt-canvas",
  components,
  defaultElementStyleByTheme = DEFAULT_ELEMENT_STYLE_BY_THEME,
  fileInputClassName = "kizkatt-file-input",
  getCanvasCursor,
  getToolForSelectedElement,
  imageInputAriaLabel = DEFAULT_IMAGE_INPUT_ARIA_LABEL,
  naming,
  renderElement,
  renderElementOverlay,
  serializeSvg,
  shouldShowStylePanel
}: KizkattGraphicEditorProps) {
  const {
    CanvasContextMenu,
    CanvasGrid,
    FooterControls,
    MainMenu,
    SelectedBounds,
    SelectionArea,
    StylePanel,
    TextEditor,
    Toolbar
  } = components;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const clipboardRef = useRef<KizkattElement[]>([]);
  const copiedPngExportRef = useRef<CopiedPngExport | null>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<KizkattTheme>(() => getStoredTheme());
  const [uiScale, setUiScale] = useState(() => getStoredUiScale());
  const [canvasBackgroundColor, setCanvasBackgroundColor] = useState(() =>
    getStoredCanvasBackgroundColor(getStoredTheme())
  );
  const [customCanvasBackgroundColor, setCustomCanvasBackgroundColor] =
    useState(() => getStoredCustomCanvasBackgroundColor(getStoredTheme()));
  const [gridColor, setGridColor] = useState(() =>
    getStoredGridColor(getStoredTheme())
  );
  const [gridSettings, setGridSettings] = useState(() =>
    getStoredGridSettings()
  );
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState<Point>(() => ({ ...INITIAL_PAN }));
  const [style, setStyle] = useState<StyleState>(
    () => defaultElementStyleByTheme[getStoredTheme()]
  );
  const initialCanvasState = useMemo(() => {
    const storedState = getStoredCanvasState();

    return storedState
      ? {
          ...storedState,
          elements: normalizeElementNames(storedState.elements, naming)
        }
      : { elements: [], selectedIds: [] };
  }, [naming]);
  const {
    canvasState,
    canRedo,
    canUndo,
    commitState,
    redo,
    replaceActiveState,
    undo
  } = useCanvasHistory(initialCanvasState);
  const [editingTextElementId, setEditingTextElementId] = useState<
    string | null
  >(null);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [selectionAreaMode, setSelectionAreaMode] =
    useState<SelectionAreaMode>("intersect");
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [snapToObjects, setSnapToObjects] = useState(false);
  const [arrowBinding, setArrowBinding] = useState(true);
  const [snapToMidpoints, setSnapToMidpoints] = useState(true);
  const [zenMode, setZenMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);

  const canvasStateRef = useRef(canvasState);
  canvasStateRef.current = canvasState;
  const mergingStyleChangeRef = useRef(false);
  const gridSizing = useMemo(
    () => getGridWorldSizing(gridSettings),
    [gridSettings]
  );
  const gridHasVisibleLayer = gridSettings.showMajor || gridSettings.showMinor;
  const gridSnapSize = gridSettings.showMinor
    ? gridSizing.minorSize
    : gridSizing.majorSize;
  useEffect(() => {
    storeCanvasState(canvasState);
  }, [canvasState]);
  const selectedIdSet = useMemo(
    () => new Set(canvasState.selectedIds),
    [canvasState.selectedIds]
  );
  const selectedElements = useMemo(
    () =>
      canvasState.elements.filter((element) => selectedIdSet.has(element.id)),
    [canvasState.elements, selectedIdSet]
  );
  const canCopySelection =
    selectedElements.length > EMPTY_COLLECTION_LENGTH;
  const canBreakApart = !viewMode && selectedElements.some(
    isBreakApartableSvgElement
  );
  const editingTextElement = canvasState.elements.find(
    (element) => element.id === editingTextElementId && element.type === "text"
  );
  const panelStyle: StyleState = selectedElements[0]
    ? {
        backgroundColor: selectedElements[0].backgroundColor,
        edgeStyle: selectedElements[0].edgeStyle ?? DEFAULT_EDGE_STYLE,
        fillStyle: selectedElements[0].fillStyle ?? DEFAULT_FILL_STYLE,
        fillWeight: selectedElements[0].fillWeight ?? DEFAULT_FILL_WEIGHT,
        opacity: selectedElements[0].opacity,
        sloppiness: selectedElements[0].sloppiness ?? DEFAULT_SELECTED_SLOPPINESS,
        sloppinessGap: selectedElements[0].sloppinessGap ?? style.sloppinessGap,
        strokeColor: selectedElements[0].strokeColor,
        strokeStyle: selectedElements[0].strokeStyle,
        strokeWidth: selectedElements[0].strokeWidth
      }
    : style;
  const showStylePanel =
    !viewMode &&
    !zenMode &&
    !menuOpen &&
    shouldShowStylePanel({
      activeTool: tool,
      selectedElements
    });
  const canGroup = !viewMode && canGroupSelection(
    canvasState.elements,
    canvasState.selectedIds
  );
  const canUngroup = !viewMode && canUngroupSelection(
    canvasState.elements,
    canvasState.selectedIds
  );

  const selectAll = useCallback(() => {
    replaceActiveState({
      ...canvasState,
      selectedBend: undefined,
      selectedIds: canvasState.elements.map((element) => element.id)
    });
  }, [canvasState, replaceActiveState]);

  const copySelected = useCallback(() => {
    clipboardRef.current = selectedElements.map((element) => ({ ...element }));
  }, [selectedElements]);

  const pasteSelected = useCallback(() => {
    if (viewMode || clipboardRef.current.length === EMPTY_COLLECTION_LENGTH) {
      return;
    }

    const pastedElements = cloneElementsWithFreshIdsAndGroups(
      clipboardRef.current,
      createId,
      DUPLICATED_ELEMENT_OFFSET,
      canvasState.elements,
      naming
    );

    commitState({
      elements: [...canvasState.elements, ...pastedElements],
      selectedBend: undefined,
      selectedIds: pastedElements.map((element) => element.id)
    });
  }, [canvasState.elements, commitState, naming, viewMode]);

  const duplicateSelected = useCallback(() => {
    if (viewMode || selectedElements.length === 0) {
      return;
    }

    const duplicatedElements = cloneElementsWithFreshIdsAndGroups(
      selectedElements,
      createId,
      DUPLICATED_ELEMENT_OFFSET,
      canvasState.elements,
      naming
    );

    commitState({
      elements: [...canvasState.elements, ...duplicatedElements],
      selectedBend: undefined,
      selectedIds: duplicatedElements.map((element) => element.id)
    });
  }, [canvasState.elements, commitState, naming, selectedElements, viewMode]);

  const getPastePoint = useCallback((clientPoint?: Point) => {
    const canvasRect = svgRef.current?.getBoundingClientRect();
    const nextClientPoint = clientPoint ??
      (canvasRect
      ? {
          x: canvasRect.left + canvasRect.width / VIEWPORT_CENTER_DIVISOR,
          y: canvasRect.top + canvasRect.height / VIEWPORT_CENTER_DIVISOR
        }
      : {
          x: window.innerWidth / VIEWPORT_CENTER_DIVISOR,
          y: window.innerHeight / VIEWPORT_CENTER_DIVISOR
        });

    return {
      x: (nextClientPoint.x - (canvasRect?.left ?? 0) - pan.x) / zoom,
      y: (nextClientPoint.y - (canvasRect?.top ?? 0) - pan.y) / zoom
    };
  }, [pan, zoom]);

  const insertPastedText = useCallback(
    (text: string, pastePoint = getPastePoint()) => {
      if (viewMode) {
        return false;
      }

      const trimmedText = text.trim();

      if (!trimmedText) {
        return false;
      }

      const lines = trimmedText.split(/\r\n|\r|\n/);
      const longestLineLength = Math.max(
        ...lines.map((line) => line.length),
        1
      );
      const elements = canvasStateRef.current.elements;
      const nextElement: KizkattElement = {
        ...createElement("text", pastePoint, style),
        height: Math.max(
          TEXT_ELEMENT_DEFAULT_HEIGHT,
          lines.length * PASTED_TEXT_LINE_HEIGHT
        ),
        name: buildElementName("text", elements, naming),
        text: trimmedText,
        width: Math.min(
          PASTED_TEXT_MAX_WIDTH,
          Math.max(
            TEXT_ELEMENT_DEFAULT_WIDTH,
            longestLineLength * PASTED_TEXT_CHARACTER_WIDTH
          )
        )
      };

      commitState({
        elements: [...elements, nextElement],
        selectedBend: undefined,
        selectedIds: [nextElement.id]
      });
      setEditingTextElementId(null);
      setTool("select");

      return true;
    },
    [commitState, getPastePoint, naming, style, viewMode]
  );

  const insertPastedImage = useCallback(
    (src: string, preferredSize?: Size, pastePoint = getPastePoint()) => {
      if (viewMode) {
        return;
      }

      const elements = canvasStateRef.current.elements;
      const baseElement: KizkattElement = {
        ...createElement("image", pastePoint, style),
        backgroundColor: TRANSPARENT_COLOR,
        height: DEFAULT_IMAGE_SIZE.height,
        name: buildElementName("image", elements, naming),
        src,
        width: DEFAULT_IMAGE_SIZE.width
      };
      let committed = false;
      const commitImage = (size = DEFAULT_IMAGE_SIZE) => {
        if (committed) {
          return;
        }

        committed = true;
        const nextElement = { ...baseElement, ...size };

        commitState({
          elements: [...canvasStateRef.current.elements, nextElement],
          selectedBend: undefined,
          selectedIds: [nextElement.id]
        });
        setPendingImageSrc(null);
        setTool("select");
      };

      const image = new Image();
      image.onload = () => {
        commitImage(
          preferredSize &&
            isExpectedCopiedPngSize(
              image.naturalWidth,
              image.naturalHeight,
              preferredSize
            )
            ? preferredSize
            : getFittedImageSize(image.naturalWidth, image.naturalHeight)
        );
      };
      image.onerror = () => {
        commitImage();
      };
      image.src = src;

      if (image.complete && image.naturalWidth >= MIN_PIXEL_SIZE) {
        commitImage(
          preferredSize &&
            isExpectedCopiedPngSize(
              image.naturalWidth,
              image.naturalHeight,
              preferredSize
            )
            ? preferredSize
            : getFittedImageSize(image.naturalWidth, image.naturalHeight)
        );
      }
      window.setTimeout(() => commitImage(), IMAGE_LOAD_FALLBACK_TIMEOUT_MS);
    },
    [commitState, getPastePoint, naming, style, viewMode]
  );

  const readClipboardImage = useCallback(
    (file: Blob, preferredSize?: Size, pastePoint?: Point) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === "string") {
          insertPastedImage(reader.result, preferredSize, pastePoint);
        }
      };
      reader.readAsDataURL(file);
    },
    [insertPastedImage]
  );

  const insertPastedSvgCode = useCallback(
    (svgCode: string, pastePoint = getPastePoint()) => {
      if (viewMode) {
        return false;
      }

      const parsedSvg = parseSvgCode(svgCode);

      if (!parsedSvg) {
        return false;
      }

      const elements = canvasStateRef.current.elements;
      const nextElement: KizkattElement = {
        ...createElement("image", pastePoint, style),
        backgroundColor: TRANSPARENT_COLOR,
        height: parsedSvg.size.height,
        name: buildElementName("image", elements, naming),
        svgContent: parsedSvg.content,
        svgUseElementStyle: parsedSvg.useElementStyle,
        svgViewBox: parsedSvg.viewBox,
        width: parsedSvg.size.width
      };
      const importedElements = parsedSvg.useElementStyle
        ? []
        : breakApartSvgElement(nextElement, elements, nextElement, naming);

      if (importedElements.length > EMPTY_COLLECTION_LENGTH) {
        commitState({
          elements: [...elements, ...importedElements],
          selectedBend: undefined,
          selectedIds: importedElements.map((element) => element.id)
        });
        setPendingImageSrc(null);
        setTool("select");

        return true;
      }

      commitState({
        elements: [...elements, nextElement],
        selectedBend: undefined,
        selectedIds: [nextElement.id]
      });
      setPendingImageSrc(null);
      setTool("select");

      return true;
    },
    [commitState, getPastePoint, naming, style, viewMode]
  );

  const deleteSelected = useCallback(() => {
    if (viewMode) {
      return;
    }

    if (canvasState.selectedBend) {
      const { bendIndex, elementId } = canvasState.selectedBend;
      const selectedBendElement = canvasState.elements.find(
        (element) => element.id === elementId
      );
      const bends = selectedBendElement
        ? getElementBends(selectedBendElement)
        : [];

      commitState({
        ...canvasState,
        elements:
          selectedBendElement && bends[bendIndex]
            ? canvasState.elements.map((element) =>
                element.id === elementId
                  ? {
                      ...element,
                      bends: bends.filter((_, index) => index !== bendIndex),
                      curve: undefined
                    }
                  : element
              )
            : canvasState.elements,
        selectedBend: undefined,
        selectedIds: selectedBendElement ? [elementId] : canvasState.selectedIds
      });
      return;
    }

    if (canvasState.selectedIds.length === EMPTY_COLLECTION_LENGTH) {
      return;
    }

    commitState({
      elements: canvasState.elements.filter(
        (element) => !canvasState.selectedIds.includes(element.id)
      ),
      selectedBend: undefined,
      selectedIds: []
    });
    setEditingTextElementId(null);
  }, [canvasState, commitState, viewMode]);

  const copySelectedLink = useCallback(() => {
    if (
      canvasState.selectedIds.length === EMPTY_COLLECTION_LENGTH ||
      !navigator.clipboard?.writeText
    ) {
      return;
    }

    void navigator.clipboard.writeText(
      `${SELECTION_LINK_PREFIX}${canvasState.selectedIds.join(",")}`
    );
  }, [canvasState.selectedIds]);

  const groupSelected = useCallback(() => {
    if (!canGroup) {
      return;
    }

    const selectedIds = expandElementIdsToGroups(
      canvasState.elements,
      canvasState.selectedIds
    );

    commitState({
      elements: groupSelectedElements(
        canvasState.elements,
        selectedIds,
        createId(),
        createGroupName(canvasState.elements, naming)
      ),
      selectedBend: undefined,
      selectedIds
    });
  }, [canGroup, canvasState, commitState, naming]);

  const ungroupSelected = useCallback(() => {
    if (!canUngroup) {
      return;
    }

    const selectedIds = expandElementIdsToGroups(
      canvasState.elements,
      canvasState.selectedIds
    );

    commitState({
      elements: ungroupSelectedElements(canvasState.elements, selectedIds),
      selectedBend: undefined,
      selectedIds
    });
  }, [canUngroup, canvasState, commitState]);

  const breakApartSelected = useCallback(() => {
    if (!canBreakApart) {
      return;
    }

    const importedElementsBySourceId = new Map<string, KizkattElement[]>();

    selectedElements.forEach((element) => {
      if (!isBreakApartableSvgElement(element)) {
        return;
      }

      const importedElements = breakApartSvgElement(
        element,
        canvasState.elements,
        element,
        naming
      );

      if (importedElements.length > EMPTY_COLLECTION_LENGTH) {
        importedElementsBySourceId.set(element.id, importedElements);
      }
    });

    if (importedElementsBySourceId.size === EMPTY_COLLECTION_LENGTH) {
      return;
    }

    const nextElements = canvasState.elements.flatMap(
      (element) => importedElementsBySourceId.get(element.id) ?? [element]
    );
    const nextSelectedIds = Array.from(importedElementsBySourceId.values())
      .flat()
      .map((element) => element.id);

    commitState({
      elements: nextElements,
      selectedBend: undefined,
      selectedIds: nextSelectedIds
    });
    setEditingTextElementId(null);
  }, [canBreakApart, canvasState.elements, commitState, naming, selectedElements]);

  const copySvgToClipboard = async () => {
    const svg = svgRef.current;

    if (!svg || !canCopySelection || !navigator.clipboard?.writeText) {
      return;
    }

    const exportBounds = getExportBounds(selectedElements);

    if (!exportBounds) {
      return;
    }

    await navigator.clipboard.writeText(
      serializeSvg(svg, {
        bounds: exportBounds,
        elementIds: canvasState.selectedIds,
        transparentBackground: true
      })
    );
  };

  const copyPngToClipboard = async () => {
    const svg = svgRef.current;

    if (
      !svg ||
      !canCopySelection ||
      !("ClipboardItem" in window) ||
      !navigator.clipboard?.write
    ) {
      return;
    }

    const exportBounds = getExportBounds(selectedElements);

    if (!exportBounds) {
      return;
    }

    const pixelRatio = PNG_EXPORT_DPI / SCREEN_DPI;
    const markup = serializeSvg(svg, {
      bounds: exportBounds,
      elementIds: canvasState.selectedIds,
      pixelRatio,
      scaleStrokes: true,
      transparentBackground: true
    });
    const blob = new Blob([markup], { type: SVG_IMAGE_MIME_TYPE });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(EXPORT_CANVAS_IMAGE_ERROR_MESSAGE));
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(
      MIN_PIXEL_SIZE,
      Math.ceil(exportBounds.width * pixelRatio)
    );
    canvas.height = Math.max(
      MIN_PIXEL_SIZE,
      Math.ceil(exportBounds.height * pixelRatio)
    );
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, PNG_IMAGE_MIME_TYPE)
    );

    if (pngBlob) {
      await navigator.clipboard.write([
        new ClipboardItem({ [PNG_IMAGE_MIME_TYPE]: pngBlob })
      ]);
      copiedPngExportRef.current = {
        createdAt: Date.now(),
        height: exportBounds.height,
        width: exportBounds.width
      };
    }
  };

  const updateSelectedStyle = (
    patch: Partial<StyleState>,
    options: { transient?: boolean } = {}
  ) => {
    setStyle((previousStyle) => ({ ...previousStyle, ...patch }));

    if (viewMode || canvasState.selectedIds.length === EMPTY_COLLECTION_LENGTH) {
      mergingStyleChangeRef.current = false;
      return;
    }

    const replaceHistoryEntry =
      Boolean(options.transient) && mergingStyleChangeRef.current;

    commitState({
      ...canvasState,
      elements: canvasState.elements.map((element) =>
        canvasState.selectedIds.includes(element.id)
          ? { ...element, ...patch }
          : element
      )
    }, {
      replace: replaceHistoryEntry
    });

    mergingStyleChangeRef.current = Boolean(options.transient);
  };

  const endSelectedStyleChange = () => {
    mergingStyleChangeRef.current = false;
  };

  const closeablePathElement =
    selectedElements.length === SINGLE_SELECTION_COUNT &&
    (selectedElements[0].type === "line" || selectedElements[0].type === "draw")
      ? selectedElements[0]
      : null;

  const updateClosedPath = (closed: boolean) => {
    if (viewMode || !closeablePathElement) {
      return;
    }

    commitState({
      ...canvasState,
      elements: canvasState.elements.map((element) =>
        element.id === closeablePathElement.id
          ? { ...element, closed }
          : element
      )
    });
  };

  const applyLayerAction = (
    action: "back" | "backward" | "forward" | "front"
  ) => {
    if (viewMode || canvasState.selectedIds.length === EMPTY_COLLECTION_LENGTH) {
      return;
    }

    commitState({
      ...canvasState,
      elements: reorderElementsByLayerAction(
        canvasState.elements,
        canvasState.selectedIds,
        action
      )
    });
  };

  const applyElementAction = (
    action: "delete" | "duplicate" | "link"
  ) => {
    if (viewMode && action !== "link") {
      return;
    }

    if (action === "delete") {
      deleteSelected();
      return;
    }

    if (action === "duplicate") {
      duplicateSelected();
      return;
    }

    copySelectedLink();
  };

  const updateTextElement = (elementId: string, text: string) => {
    if (viewMode) {
      return;
    }

    replaceActiveState({
      ...canvasState,
      elements: canvasState.elements.map((element) =>
        element.id === elementId ? { ...element, text } : element
      )
    });
  };

  const resetCanvas = () => {
    if (viewMode) {
      setMenuOpen(false);
      return;
    }

    commitState({ elements: [], selectedBend: undefined, selectedIds: [] });
    setEditingTextElementId(null);
    setMenuOpen(false);
  };

  const quickSaveCanvas = () => {
    storeQuickCanvasState(canvasStateRef.current);
    setMenuOpen(false);
  };

  const quickLoadCanvas = () => {
    if (viewMode) {
      setMenuOpen(false);
      return;
    }

    const storedState = getStoredQuickCanvasState() ?? getStoredCanvasState();

    if (!storedState) {
      setMenuOpen(false);
      return;
    }

    commitState(storedState);
    setEditingTextElementId(null);
    setTool("select");
    setMenuOpen(false);
  };

  const setStoredTheme = (nextTheme: KizkattTheme) => {
    const previousTheme = theme;

    setTheme(nextTheme);
    setCanvasBackgroundColor(getStoredCanvasBackgroundColor(nextTheme));
    setCustomCanvasBackgroundColor(
      getStoredCustomCanvasBackgroundColor(nextTheme)
    );
    setGridColor(getStoredGridColor(nextTheme));
    setStyle((previousStyle) =>
      isSameStyle(previousStyle, defaultElementStyleByTheme[previousTheme])
        ? defaultElementStyleByTheme[nextTheme]
        : previousStyle
    );
    storeTheme(nextTheme);
  };
  const setStoredUiScale = (scale: number) => {
    setUiScale(scale);
    storeUiScale(scale);
  };

  const setStoredCanvasBackground = (color: string) => {
    setCanvasBackgroundColor(color);
    storeCanvasBackgroundColor(color, theme);
  };

  const pickCanvasBackground = async () => {
    const EyeDropper = (window as Window & { EyeDropper?: EyeDropperConstructor })
      .EyeDropper;

    if (!EyeDropper) {
      return;
    }

    const result = await new EyeDropper().open();
    setCustomCanvasBackgroundColor(result.sRGBHex);
    storeCustomCanvasBackgroundColor(result.sRGBHex, theme);
    setStoredCanvasBackground(result.sRGBHex);
  };

  const setStoredGridColor = (color: string) => {
    setGridColor(color);
    storeGridColor(color, theme);
  };

  const setStoredGridSettings = (settings: GridSettings) => {
    const normalizedSettings = normalizeGridSettings(settings);
    const gridLayerVisibilityChanged =
      gridSettings.showMajor !== normalizedSettings.showMajor ||
      gridSettings.showMinor !== normalizedSettings.showMinor;
    const nextGridHasVisibleLayer =
      normalizedSettings.showMajor || normalizedSettings.showMinor;

    setGridSettings(normalizedSettings);
    storeGridSettings(normalizedSettings);

    if (!nextGridHasVisibleLayer) {
      setShowGrid(false);
    } else if (gridLayerVisibilityChanged) {
      setShowGrid(true);
    }
  };

  const setReadOnlyViewMode = (updater: (value: boolean) => boolean) => {
    setViewMode((previousValue) => {
      const nextValue = updater(previousValue);

      if (nextValue) {
        setEditingTextElementId(null);
        setPendingImageSrc(null);
        setTool("select");
      }

      return nextValue;
    });
  };

  const activateTool = (nextTool: Tool) => {
    if (viewMode && nextTool !== "hand" && nextTool !== "select") {
      return;
    }

    if (nextTool === "image") {
      imageInputRef.current?.click();
      return;
    }

    setTool(nextTool);
  };

  const readImageFile = (file: File) => {
    if (viewMode) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPendingImageSrc(reader.result);
        setTool("image");
      }
    };
    reader.readAsDataURL(file);
  };

  const onImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = EMPTY_INPUT_VALUE;

    if (!file) {
      return;
    }

    readImageFile(file);
  };

  const onBoardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (isEditableKeyboardTarget(event.target)) {
      return;
    }

    if (isAllowedEditingShortcut(event)) {
      const key = event.key.toLowerCase();

      if (
        key === EDITING_SHORTCUT_KEY.paste &&
        clipboardRef.current.length === EMPTY_COLLECTION_LENGTH
      ) {
        return;
      }

      event.preventDefault();

      if (key === EDITING_SHORTCUT_KEY.selectAll) {
        selectAll();
      } else if (key === EDITING_SHORTCUT_KEY.copy) {
        copySelected();
      } else if (viewMode) {
        return;
      } else if (key === EDITING_SHORTCUT_KEY.paste) {
        pasteSelected();
      } else if (key === EDITING_SHORTCUT_KEY.undo && event.shiftKey) {
        redo();
      } else if (key === EDITING_SHORTCUT_KEY.undo) {
        undo();
      } else if (key === EDITING_SHORTCUT_KEY.redo) {
        redo();
      }

      return;
    }

    if (event.key === EDITOR_KEY.delete) {
      event.preventDefault();
      if (!viewMode) {
        deleteSelected();
      }
      return;
    }

    stopDrawingEngineShortcuts(event);
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const runContextMenuAction = (action: () => void | Promise<void>) => {
    closeContextMenu();
    void action();
  };

  const onCanvasContextMenu = (event: ReactMouseEvent<SVGSVGElement>) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY
    });
  };

  const getCopiedPngPreferredSize = (file: Blob): Size | undefined => {
    const copiedPngExport = copiedPngExportRef.current;

    if (
      file.type !== PNG_IMAGE_MIME_TYPE ||
      !copiedPngExport ||
      Date.now() - copiedPngExport.createdAt > COPIED_PNG_EXPORT_SIZE_TTL_MS
    ) {
      return undefined;
    }

    return {
      height: copiedPngExport.height,
      width: copiedPngExport.width
    };
  };

  const pasteFromContextMenu = async () => {
    if (viewMode) {
      return;
    }

    const pastePoint = getPastePoint(
      contextMenu
        ? {
            x: contextMenu.x,
            y: contextMenu.y
          }
        : undefined
    );

    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();

        for (const item of items) {
          const imageType = item.types.find((type) =>
            type.startsWith(IMAGE_MIME_TYPE_PREFIX)
          );

          if (imageType) {
            const imageBlob = await item.getType(imageType);
            readClipboardImage(
              imageBlob,
              getCopiedPngPreferredSize(imageBlob),
              pastePoint
            );
            return;
          }
        }

        for (const item of items) {
          if (item.types.includes(PLAIN_TEXT_MIME_TYPE)) {
            const textBlob = await item.getType(PLAIN_TEXT_MIME_TYPE);
            const text = await textBlob.text();

            if (insertPastedText(text, pastePoint)) {
              return;
            }
          }
        }
      }

      const text = await navigator.clipboard?.readText?.();

      if (text && insertPastedText(text, pastePoint)) {
        return;
      }
    } catch {
      
    }

    pasteSelected();
  };

  const pasteSvgCodeFromContextMenu = async () => {
    if (viewMode) {
      return;
    }

    const pastePoint = getPastePoint(
      contextMenu
        ? {
            x: contextMenu.x,
            y: contextMenu.y
          }
        : undefined
    );

    try {
      const text = await navigator.clipboard?.readText?.();

      if (text) {
        insertPastedSvgCode(text, pastePoint);
      }
    } catch {
      
    }
  };

  const onBoardPaste = (event: ClipboardEvent<HTMLElement>) => {
    if (viewMode || isEditableKeyboardTarget(event.target)) {
      return;
    }

    const clipboardData = event.clipboardData;
    const imageItem = Array.from(clipboardData.items).find((item) =>
      item.type.startsWith(IMAGE_MIME_TYPE_PREFIX)
    );
    const imageFile =
      imageItem?.getAsFile() ??
      Array.from(clipboardData.files).find((file) =>
        file.type.startsWith(IMAGE_MIME_TYPE_PREFIX)
      );

    if (imageFile) {
      event.preventDefault();
      readClipboardImage(imageFile, getCopiedPngPreferredSize(imageFile));
      return;
    }

    if (insertPastedText(clipboardData.getData(PLAIN_TEXT_MIME_TYPE))) {
      event.preventDefault();
    }
  };

  const onBoardPointerDownCapture = (
    event: ReactPointerEvent<HTMLElement>
  ) => {
    if (!menuOpen || !(event.target instanceof Element)) {
      return;
    }

    if (
      event.target.closest(".kizkatt-main-menu") ||
      event.target.closest(".kizkatt-menu-button")
    ) {
      return;
    }

    setMenuOpen(false);
  };

  const { interaction, onPointerDown, onPointerMove, onPointerUp } =
    useToolPointerHandlers({
      canvasState,
      canvasStateRef,
      closeContextMenu,
      commitState,
      createElementName: (type, elements) =>
        buildElementName(type, elements, naming),
      getToolForSelectedElement,
      pan,
      pendingImageSrc,
      replaceActiveState,
      selectionAreaMode,
      selectedElements,
      setEditingTextElementId,
      setPan,
      setPendingImageSrc,
      setTool,
      gridCellSize: gridSnapSize,
      snapToGrid: snapToGrid && gridHasVisibleLayer,
      snapToMidpoints,
      snapToObjects,
      style,
      svgRef,
      tool,
      viewMode,
      zoom
    });

  const canvasCursor =
    getActiveInteractionCursor(interaction) ??
    getCanvasCursor({
      isPanning: interaction?.type === "pan",
      tool
    });
  const renderInlineSelection = !renderElementOverlay;
  const getElementSelectionRenderState = (element: KizkattElement) => {
    const isSelected = selectedIdSet.has(element.id);
    const showPrimaryOverlay =
      !viewMode && selectedElements.length <= SINGLE_SELECTION_COUNT && isSelected;
    const showInternalOverlay =
      !viewMode && selectedElements.length > SINGLE_SELECTION_COUNT && isSelected;
    const isDrawingFreehand =
      interaction?.type === "create" &&
      interaction.elementId === element.id &&
      element.type === "draw";
    const isCreatingLinearElement =
      interaction?.type === "create" &&
      interaction.elementId === element.id &&
      (element.type === "line" || element.type === "arrow");
    const isCreatingElement =
      interaction?.type === "create" && interaction.elementId === element.id;
    const isRotatingSelection = interaction?.type === "rotate";

    return {
      options: {
        selectedBendIndex:
          canvasState.selectedBend?.elementId === element.id
            ? canvasState.selectedBend.bendIndex
            : undefined,
        showLinearBendHandles: !isCreatingLinearElement,
        showRotateHoverIcon: !isRotatingSelection,
        showRotateHandle: !isCreatingElement,
        showSelectionBounds: !isRotatingSelection
      },
      showInternalOverlay,
      showPrimaryOverlay: showPrimaryOverlay && !isDrawingFreehand
    };
  };

  return (
    <section
      className={`${boardClassName} ${boardThemeClassName(theme)}`}
      aria-label={boardAriaLabel}
      style={{ "--kizkatt-ui-scale": uiScale } as CSSProperties}
      tabIndex={CANVAS_TAB_INDEX}
      onKeyDownCapture={onBoardKeyDown}
      onPaste={onBoardPaste}
      onPointerDownCapture={onBoardPointerDownCapture}
    >
      {!zenMode && <Toolbar activeTool={tool} onActivateTool={activateTool} />}

      <input
        ref={imageInputRef}
        className={fileInputClassName}
        type="file"
        accept={IMAGE_FILE_ACCEPT}
        aria-label={imageInputAriaLabel}
        onChange={onImageFileChange}
      />

      <CanvasContextMenu
        arrowBinding={arrowBinding}
        canBreakApart={canBreakApart}
        canCopySelection={canCopySelection}
        canGroup={canGroup}
        canUngroup={canUngroup}
        contextMenu={contextMenu}
        onCloseAndRun={runContextMenuAction}
        onBreakApart={breakApartSelected}
        onCopy={copySelected}
        onCopyPng={copyPngToClipboard}
        onCopySvg={copySvgToClipboard}
        onGroup={groupSelected}
        onPaste={pasteFromContextMenu}
        onPasteSvgCode={pasteSvgCodeFromContextMenu}
        onSelectAll={selectAll}
        onUngroup={ungroupSelected}
        selectionAreaMode={selectionAreaMode}
        setArrowBinding={setArrowBinding}
        setSelectionAreaMode={setSelectionAreaMode}
        setShowGrid={setShowGrid}
        setSnapToGrid={setSnapToGrid}
        setSnapToMidpoints={setSnapToMidpoints}
        setSnapToObjects={setSnapToObjects}
        setViewMode={setReadOnlyViewMode}
        setZenMode={setZenMode}
        canUseGrid={gridHasVisibleLayer}
        showGrid={showGrid && gridHasVisibleLayer}
        snapToGrid={snapToGrid && gridHasVisibleLayer}
        snapToMidpoints={snapToMidpoints}
        snapToObjects={snapToObjects}
        viewMode={viewMode}
        zenMode={zenMode}
      />

      <MainMenu
        canvasBackgroundColor={canvasBackgroundColor}
        customCanvasBackgroundColor={customCanvasBackgroundColor}
        gridColor={gridColor}
        gridSettings={gridSettings}
        menuOpen={menuOpen}
        onExport={quickSaveCanvas}
        onOpen={quickLoadCanvas}
        onCanvasBackgroundChange={setStoredCanvasBackground}
        onGridColorChange={setStoredGridColor}
        onGridSettingsChange={setStoredGridSettings}
        onMenuOpenChange={setMenuOpen}
        onPickCanvasBackground={() => void pickCanvasBackground()}
        onResetCanvas={resetCanvas}
        onThemeChange={setStoredTheme}
        onUiScaleChange={setStoredUiScale}
        theme={theme}
        uiScale={uiScale}
      />
      {showStylePanel && (
        <StylePanel
          activeTool={tool}
          canToggleClosedPath={Boolean(closeablePathElement)}
          closedPath={Boolean(closeablePathElement?.closed)}
          style={panelStyle}
          selectedElements={selectedElements}
          theme={theme}
          onClosedPathChange={updateClosedPath}
          onStyleChange={updateSelectedStyle}
          onStyleChangeEnd={endSelectedStyleChange}
          onAction={applyElementAction}
          onLayerAction={applyLayerAction}
        />
      )}
      {editingTextElement && (
        <TextEditor
          element={editingTextElement}
          onBlur={() => setEditingTextElementId(null)}
          onChange={(text) => updateTextElement(editingTextElement.id, text)}
          pan={pan}
          zoom={zoom}
        />
      )}

      <svg
        ref={svgRef}
        className={canvasClassName}
        role="application"
        aria-label={canvasAriaLabel}
        style={
          {
            "--kizkatt-canvas-grid": gridColor,
            backgroundColor: canvasBackgroundColor,
            cursor: canvasCursor
          } as CSSProperties
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onContextMenu={onCanvasContextMenu}
      >
        <CanvasGrid
          gridSettings={gridSettings}
          pan={pan}
          visible={showGrid && gridHasVisibleLayer}
          zoom={zoom}
        />
        <defs>
          <marker
            id={arrowMarkerId}
            viewBox={ARROW_MARKER_VIEW_BOX}
            refX={ARROW_MARKER_REF_X}
            refY={ARROW_MARKER_REF_Y}
            markerWidth={ARROW_MARKER_WIDTH}
            markerHeight={ARROW_MARKER_HEIGHT}
            orient={ARROW_MARKER_ORIENT}
          >
            <path d={ARROW_MARKER_PATH} />
          </marker>
        </defs>
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {canvasState.elements.map((element) => {
            const { options, showPrimaryOverlay } =
              getElementSelectionRenderState(element);

            return renderElement(
              element,
              renderInlineSelection && showPrimaryOverlay,
              options
            );
          })}
          {renderElementOverlay &&
            canvasState.elements.map((element) => {
              const { options, showInternalOverlay, showPrimaryOverlay } =
                getElementSelectionRenderState(element);

              if (showPrimaryOverlay) {
                return renderElementOverlay(element, {
                  ...options,
                  overlayVariant: "primary"
                });
              }

              if (showInternalOverlay) {
                return renderElementOverlay(element, {
                  ...options,
                  overlayVariant: "internal"
                });
              }

              return null;
            })}
          <SelectionArea interaction={interaction} />
          {!viewMode && (
            <SelectedBounds
              elements={selectedElements}
              interaction={interaction}
              showRotateHoverIcon={interaction?.type !== "rotate"}
            />
          )}
        </g>
      </svg>

      {!zenMode && (
        <FooterControls
          canRedo={!viewMode && canRedo}
          canUndo={!viewMode && canUndo}
          zoom={zoom}
          onRedo={() => {
            if (!viewMode) {
              redo();
            }
          }}
          onUndo={() => {
            if (!viewMode) {
              undo();
            }
          }}
          onZoomIn={() =>
            setZoom((value) => Math.min(MAX_ZOOM, value + ZOOM_STEP))
          }
          onZoomOut={() =>
            setZoom((value) => Math.max(MIN_ZOOM, value - ZOOM_STEP))
          }
        />
      )}
    </section>
  );
}
