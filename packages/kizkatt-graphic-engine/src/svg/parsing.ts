import {
  DEFAULT_FILL_STYLE,
  DEFAULT_FILL_WEIGHT,
  DEFAULT_IMAGE_SIZE,
  PERCENT_MAX_VALUE,
  TRANSPARENT_COLOR
} from "../config/constants";
import { getFittedImageSize, getImageSize } from "../import/imageSizing";
import type { KizkattElement, StyleState } from "../model/types";

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
function parseSvgLength(value: string | null) {
  if (!value) {
    return null;
  }

  const numericValue = Number.parseFloat(value);

  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : null;
}

export function parseSvgNumber(value: string | null) {
  if (!value) {
    return null;
  }

  const numericValue = Number.parseFloat(value);

  return Number.isFinite(numericValue) ? numericValue : null;
}

export function parseSvgViewBox(value: string | null) {
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

export function getSvgRoot(document: Document) {
  const root = document.querySelector("svg");

  return root?.parentNode === document ? root : null;
}

export function parseSvgDocument(svgCode: string) {
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

export function parseSvgCode(svgCode: string) {
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
    canvasBounds: isKizkattExport ? viewBoxSize : undefined,
    content: getSvgContent(root),
    size,
    useElementStyle: !isKizkattExport,
    viewBox
  };
}

function isSvgCode(svgCode: string) {
  const document = parseSvgDocument(svgCode);

  return Boolean(getSvgRoot(document) && !document.querySelector("parsererror"));
}

export function isBreakApartableSvgElement(element: KizkattElement) {
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

export function getBreakApartSvgCode(element: KizkattElement) {
  if (element.svgContent) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${
      element.svgViewBox ?? `0 0 ${element.width} ${element.height}`
    }">${element.svgContent}</svg>`;
  }

  return getSvgCodeFromDataUrl(element.src);
}

export function getSvgNumber(element: Element, attributeName: string) {
  return parseSvgLength(element.getAttribute(attributeName));
}

export function getInheritedSvgAttribute(element: Element, attributeName: string) {
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

export function parseSvgOpacity(value: string | null) {
  if (!value) {
    return PERCENT_MAX_VALUE;
  }

  const parsedValue = Number.parseFloat(value);

  return Number.isFinite(parsedValue)
    ? Math.max(0, Math.min(PERCENT_MAX_VALUE, parsedValue * PERCENT_MAX_VALUE))
    : PERCENT_MAX_VALUE;
}

export function resolveSvgPaint(value: string | null, currentColor: string) {
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

export function getSvgStrokeStyle(element: Element): KizkattElement["strokeStyle"] {
  const storedStyle = element.getAttribute("data-stroke-style");

  if (
    storedStyle === "solid" ||
    storedStyle === "dashed" ||
    storedStyle === "dotted" ||
    storedStyle === "dashDot" ||
    storedStyle === "stitched" ||
    storedStyle === "wavy" ||
    storedStyle === "zigzag"
  ) {
    return storedStyle;
  }

  const dasharray = getInheritedSvgAttribute(element, "stroke-dasharray");

  if (!dasharray || dasharray === "none") {
    return "solid";
  }

  const dashValues = dasharray
    .split(/[\s,]+/)
    .map((value) => Number.parseFloat(value))
    .filter(Number.isFinite);

  if (dashValues.length >= 4 && dashValues[0] > dashValues[2]) {
    return "dashDot";
  }

  const strokeWidth = getSvgNumber(element, "stroke-width") ?? 0;

  if (
    dashValues.length === 2 &&
    dashValues[0] > 0 &&
    strokeWidth > 0 &&
    dashValues[0] < strokeWidth
  ) {
    return "stitched";
  }

  if (dashValues.length >= 2 && dashValues[0] <= dashValues[1]) {
    return "dotted";
  }

  return "dashed";
}

export function getSvgElementStyle(
  group: Element,
  element: Element,
  fallbackStyle: StyleState
): StyleState {
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
  const storedStrokeLineCount = Number.parseInt(
    getInheritedSvgAttribute(element, "data-stroke-line-count") ?? "",
    10
  );
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
    strokeLineCount: Number.isFinite(storedStrokeLineCount)
      ? Math.min(10, Math.max(1, storedStrokeLineCount))
      : secondaryStroke
        ? 2
        : fallbackStyle.strokeLineCount,
    strokeStyle: getSvgStrokeStyle(element),
    strokeWidth: stroke ? strokeWidth ?? fallbackStyle.strokeWidth : 0
  };
}
