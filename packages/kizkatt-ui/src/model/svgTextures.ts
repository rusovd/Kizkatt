const DEFAULT_SVG_CANVAS_SIZE = 1000;

export type SvgTextureCanvas = {
  height: number;
  minX: number;
  minY: number;
  width: number;
};

function parsePositiveLength(value: string | null) {
  if (!value || value.trim().endsWith("%")) {
    return null;
  }

  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseViewBox(value: string | null): SvgTextureCanvas | null {
  const values = value?.trim().split(/[\s,]+/).map(Number);

  if (
    values?.length !== 4 ||
    values.some((entry) => !Number.isFinite(entry)) ||
    values[2] <= 0 ||
    values[3] <= 0
  ) {
    return null;
  }

  return {
    height: values[3],
    minX: values[0],
    minY: values[1],
    width: values[2]
  };
}

function parseSvgDocument(code: string) {
  if (!code.trim()) {
    return null;
  }

  const document = new DOMParser().parseFromString(
    code.replace(/^\uFEFF/, ""),
    "image/svg+xml"
  );

  return document.documentElement.localName === "svg" &&
    !document.querySelector("parsererror")
    ? document
    : null;
}

function getDocumentCanvas(document: Document): SvgTextureCanvas {
  const root = document.documentElement;
  const rootViewBox = parseViewBox(root.getAttribute("viewBox"));

  if (rootViewBox) {
    return rootViewBox;
  }

  const width = parsePositiveLength(root.getAttribute("width"));
  const height = parsePositiveLength(root.getAttribute("height"));

  if (width && height) {
    return { height, minX: 0, minY: 0, width };
  }

  for (const element of root.querySelectorAll("[viewBox]")) {
    const nestedViewBox = parseViewBox(element.getAttribute("viewBox"));

    if (nestedViewBox) {
      return nestedViewBox;
    }
  }

  for (const element of root.querySelectorAll("pattern, svg, symbol")) {
    const nestedWidth = parsePositiveLength(element.getAttribute("width"));
    const nestedHeight = parsePositiveLength(element.getAttribute("height"));

    if (nestedWidth && nestedHeight) {
      return {
        height: nestedHeight,
        minX: 0,
        minY: 0,
        width: nestedWidth
      };
    }
  }

  return {
    height: DEFAULT_SVG_CANVAS_SIZE,
    minX: 0,
    minY: 0,
    width: DEFAULT_SVG_CANVAS_SIZE
  };
}

export function getSvgTextureCanvas(code: string): SvgTextureCanvas {
  const document = parseSvgDocument(code);

  return document
    ? getDocumentCanvas(document)
    : {
        height: DEFAULT_SVG_CANVAS_SIZE,
        minX: 0,
        minY: 0,
        width: DEFAULT_SVG_CANVAS_SIZE
      };
}

export function normalizeSvgTextureCode(code: string) {
  const document = parseSvgDocument(code);

  if (!document) {
    return code;
  }

  const root = document.documentElement;
  const canvas = getDocumentCanvas(document);

  root.setAttribute(
    "viewBox",
    `${canvas.minX} ${canvas.minY} ${canvas.width} ${canvas.height}`
  );
  root.setAttribute("width", String(canvas.width));
  root.setAttribute("height", String(canvas.height));
  root.setAttribute("preserveAspectRatio", "none");

  return new XMLSerializer().serializeToString(document);
}

export function createSvgTextureDataUrl(code: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    normalizeSvgTextureCode(code)
  )}`;
}
