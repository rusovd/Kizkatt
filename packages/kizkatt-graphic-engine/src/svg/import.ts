import {
  MIN_ELEMENT_SIZE,
  PERCENT_MAX_VALUE,
  TEXT_ELEMENT_DEFAULT_HEIGHT,
  TEXT_ELEMENT_DEFAULT_WIDTH,
  TRANSPARENT_COLOR,
  VIEWPORT_CENTER_DIVISOR
} from "../config/constants";
import { transformSvgPathData } from "../geometry";
import {
  createId,
  normalizeElement,
  withUpdatedObjectBase
} from "../model/element";
import { createElementName as buildElementName } from "../model/naming";
import type { ElementNamingConfig } from "../model/naming";
import type {
  Bounds,
  KizkattElement,
  Point,
  StyleState
} from "../model/types";
import {
  getBreakApartSvgCode,
  getInheritedSvgAttribute,
  getSvgElementStyle,
  getSvgNumber,
  getSvgRoot,
  parseSvgDocument,
  parseSvgNumber,
  parseSvgViewBox
} from "./parsing";

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
): StyleState {
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

function isImportedElementType(value: string): value is KizkattElement["type"] {
  return SVG_IMPORT_ELEMENT_TYPES.has(value);
}

function getElementTypeFromSvgGroup(group: Element) {
  const type = group.getAttribute("data-element-type");

  return type && isImportedElementType(type) ? type : null;
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

function createImportedDrawElement(
  root: SVGSVGElement,
  group: Element,
  sourceElement: KizkattElement,
  viewBox: Bounds,
  existingElements: KizkattElement[],
  importedElements: KizkattElement[],
  groupIdMap: Map<string, string>,
  fallbackStyle: StyleState,
  naming?: ElementNamingConfig
) {
  const path = Array.from(group.children).find(
    (child) => child.tagName.toLowerCase() === "path"
  );

  if (!path) {
    return null;
  }

  const importedElement = createImportedGenericPathElement(
    root,
    path,
    sourceElement,
    viewBox,
    existingElements,
    importedElements,
    fallbackStyle,
    naming
  );

  return importedElement
    ? {
        ...importedElement,
        ...getImportedGroup(group, groupIdMap, createId)
      }
    : null;
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
  const border = group.querySelector("[data-image-border]");
  const imageBorderEnabled =
    group.getAttribute("data-image-border-enabled") === "true";

  return normalizeElement({
    ...mappedGeometry,
    ...getSvgElementStyle(
      group,
      imageBorderEnabled && border ? border : shape,
      fallbackStyle
    ),
    ...getImportedGroup(group, groupIdMap, createId),
    backgroundColor: TRANSPARENT_COLOR,
    edgeStyle:
      imageBorderEnabled && border && (getSvgNumber(border, "rx") ?? 0) <= 0
        ? "sharp"
        : "round",
    id: createId(),
    imageBorderEnabled,
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

export function breakApartSvgElement(
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

    if (!type) {
      return;
    }

    if (type === "draw") {
      const importedDrawElement = createImportedDrawElement(
        root,
        group,
        sourceElement,
        viewBox,
        existingElements,
        importedElements,
        groupIdMap,
        fallbackStyle,
        naming
      );

      if (importedDrawElement) {
        importedElements.push(importedDrawElement);
      }
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
    return importedElements.map(withUpdatedObjectBase);
  }

  return breakApartGenericSvgElement(
    root,
    sourceElement,
    viewBox,
    existingElements,
    fallbackStyle,
    naming
  ).map(withUpdatedObjectBase);
}
