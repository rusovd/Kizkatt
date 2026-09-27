const SVG_PAINT_ATTRIBUTES = new Set([
  "color",
  "fill",
  "flood-color",
  "lighting-color",
  "stop-color",
  "stroke"
]);
const SVG_PAINT_DECLARATION =
  /(^|[;{])(\s*(?:color|fill|flood-color|lighting-color|stop-color|stroke)\s*:\s*)([^;}]+)/gi;
const SVG_STROKE_WIDTH_DECLARATION =
  /(^|[;{])(\s*stroke-width\s*:\s*)([^;}]+)/gi;
const BASIC_NAMED_COLORS: Record<string, string> = {
  aqua: "#00ffff",
  black: "#000000",
  blue: "#0000ff",
  fuchsia: "#ff00ff",
  gray: "#808080",
  green: "#008000",
  lime: "#00ff00",
  maroon: "#800000",
  navy: "#000080",
  olive: "#808000",
  orange: "#ffa500",
  purple: "#800080",
  red: "#ff0000",
  silver: "#c0c0c0",
  teal: "#008080",
  white: "#ffffff",
  yellow: "#ffff00"
};

export type SvgColorAdjustment = {
  color: string;
  count: number;
  value: string;
};

function parseSvgDocument(code: string) {
  const document = new DOMParser().parseFromString(code, "image/svg+xml");

  return document.documentElement.localName === "svg" &&
    !document.querySelector("parsererror")
    ? document
    : null;
}

function byteToHex(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, "0");
}

function normalizeRgbColor(value: string) {
  const match = /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i
    .exec(value);

  if (!match) {
    return null;
  }

  const alphaValue = match[4]?.endsWith("%")
    ? Number.parseFloat(match[4]) * 2.55
    : Number.parseFloat(match[4] ?? "1") * 255;
  const alpha = match[4] ? byteToHex(alphaValue) : "";

  return `#${byteToHex(Number(match[1]))}${byteToHex(Number(match[2]))}${byteToHex(Number(match[3]))}${alpha}`;
}

function normalizeSvgColor(value: string) {
  const trimmed = value.replace(/\s*!important\s*$/i, "").trim();
  const hex = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.exec(trimmed);

  if (hex) {
    const compact = hex[1].toLowerCase();

    return compact.length <= 4
      ? `#${[...compact].map((character) => character.repeat(2)).join("")}`
      : `#${compact}`;
  }

  return normalizeRgbColor(trimmed) ?? BASIC_NAMED_COLORS[trimmed.toLowerCase()] ?? null;
}

function forEachDeclarationValue(
  value: string,
  pattern: RegExp,
  callback: (declarationValue: string) => void
) {
  for (const match of value.matchAll(new RegExp(pattern.source, pattern.flags))) {
    callback(match[3]);
  }
}

function replaceDeclarationValues(
  value: string,
  pattern: RegExp,
  replace: (declarationValue: string) => string
) {
  return value.replace(
    new RegExp(pattern.source, pattern.flags),
    (_match, delimiter: string, property: string, declarationValue: string) =>
      `${delimiter}${property}${replace(declarationValue)}`
  );
}

function getReplacementColor(previous: string, nextColor: string) {
  const alpha = previous.length === 9 ? previous.slice(7) : "";

  return `${nextColor.slice(0, 7)}${alpha}`;
}

export function getSvgColorAdjustments(code: string): SvgColorAdjustment[] {
  const document = parseSvgDocument(code);

  if (!document) {
    return [];
  }

  const colors = new Map<string, number>();
  const addColor = (value: string) => {
    const color = normalizeSvgColor(value);

    if (color && color !== "#00000000") {
      colors.set(color, (colors.get(color) ?? 0) + 1);
    }
  };

  for (const element of document.querySelectorAll("*")) {
    for (const attribute of element.attributes) {
      if (SVG_PAINT_ATTRIBUTES.has(attribute.name.toLowerCase())) {
        addColor(attribute.value);
      } else if (attribute.name.toLowerCase() === "style") {
        forEachDeclarationValue(
          attribute.value,
          SVG_PAINT_DECLARATION,
          addColor
        );
      }
    }
  }

  for (const style of document.querySelectorAll("style")) {
    forEachDeclarationValue(
      style.textContent ?? "",
      SVG_PAINT_DECLARATION,
      addColor
    );
  }

  return [...colors.entries()].map(([value, count]) => ({
    color: value.slice(0, 7),
    count,
    value
  }));
}

export function replaceSvgColor(
  code: string,
  previousColor: string,
  nextColor: string
) {
  const document = parseSvgDocument(code);

  if (!document) {
    return code;
  }

  const replaceColor = (value: string) => {
    const important = value.match(/\s*!important\s*$/i)?.[0] ?? "";
    const normalized = normalizeSvgColor(value);

    return normalized === previousColor
      ? `${getReplacementColor(previousColor, nextColor)}${important}`
      : value;
  };

  for (const element of document.querySelectorAll("*")) {
    for (const attribute of [...element.attributes]) {
      const attributeName = attribute.name.toLowerCase();

      if (SVG_PAINT_ATTRIBUTES.has(attributeName)) {
        element.setAttribute(attribute.name, replaceColor(attribute.value));
      } else if (attributeName === "style") {
        element.setAttribute(
          attribute.name,
          replaceDeclarationValues(
            attribute.value,
            SVG_PAINT_DECLARATION,
            replaceColor
          )
        );
      }
    }
  }

  for (const style of document.querySelectorAll("style")) {
    style.textContent = replaceDeclarationValues(
      style.textContent ?? "",
      SVG_PAINT_DECLARATION,
      replaceColor
    );
  }

  return new XMLSerializer().serializeToString(document);
}

function hasStrokePaint(value: string) {
  const normalized = value.replace(/\s*!important\s*$/i, "").trim().toLowerCase();

  return Boolean(normalized && normalized !== "none" && normalized !== "transparent");
}

export function svgHasEditableStrokes(code: string) {
  const document = parseSvgDocument(code);

  if (!document) {
    return false;
  }

  for (const element of document.querySelectorAll("*")) {
    const stroke = element.getAttribute("stroke");

    if (stroke && hasStrokePaint(stroke)) {
      return true;
    }

    const styleStroke = /(?:^|;)\s*stroke\s*:\s*([^;]+)/i.exec(
      element.getAttribute("style") ?? ""
    )?.[1];

    if (styleStroke && hasStrokePaint(styleStroke)) {
      return true;
    }
  }

  return [...document.querySelectorAll("style")].some((style) =>
    /(?:^|[;{])\s*stroke\s*:\s*(?!none|transparent)/i.test(
      style.textContent ?? ""
    )
  );
}

function scaleSvgLength(value: string, factor: number) {
  const match = /^(\s*)([-+]?(?:\d*\.)?\d+)([a-z%]*)(\s*!important\s*)?$/i
    .exec(value);

  if (!match) {
    return value;
  }

  const scaled = Number.parseFloat((Number(match[2]) * factor).toFixed(4));

  return `${match[1]}${scaled}${match[3]}${match[4] ?? ""}`;
}

export function scaleSvgStrokeWidths(code: string, factor: number) {
  const document = parseSvgDocument(code);

  if (!document || !Number.isFinite(factor) || factor <= 0 || factor === 1) {
    return code;
  }

  const root = document.documentElement;
  const rootHasStrokeWidth = root.hasAttribute("stroke-width") ||
    /(?:^|;)\s*stroke-width\s*:/i.test(root.getAttribute("style") ?? "");

  for (const element of document.querySelectorAll("*")) {
    const strokeWidth = element.getAttribute("stroke-width");

    if (strokeWidth !== null) {
      element.setAttribute(
        "stroke-width",
        scaleSvgLength(strokeWidth, factor)
      );
    }

    const style = element.getAttribute("style");

    if (style) {
      element.setAttribute(
        "style",
        replaceDeclarationValues(
          style,
          SVG_STROKE_WIDTH_DECLARATION,
          (value) => scaleSvgLength(value, factor)
        )
      );
    }
  }

  for (const style of document.querySelectorAll("style")) {
    style.textContent = replaceDeclarationValues(
      style.textContent ?? "",
      SVG_STROKE_WIDTH_DECLARATION,
      (value) => scaleSvgLength(value, factor)
    );
  }

  if (!rootHasStrokeWidth) {
    root.setAttribute("stroke-width", String(factor));
  }

  return new XMLSerializer().serializeToString(document);
}
