import type { CSSProperties, ReactNode } from "react";

import {
  getElementBends,
  getElementCenter,
  getElementTransformedCorners,
  getLinearElementPath,
  getLinearElementPoints
} from "../../geometry";
import { canElementUseBackground, isElementPathClosed } from "../../model/element";
import type { KizkattElement } from "../../model/types";
import {
  ARROW_MARKER_PATH,
  ARROW_MARKER_REF_Y,
  PERCENT_MAX_VALUE
} from "../../config/constants";
import {
  getArrowheadGeometry,
  shortenLinePointsForArrowheads,
  type ArrowheadGeometry
} from "./arrowheadGeometry";
import { ElementGroup } from "./ElementGroup";
import {
  ElementOverlay,
  WorldResizeOverlay,
  WorldSkewOverlay
} from "./ElementOverlay";
import {
  getElementShapeProps,
  getElementTransform,
  getFreehandPath,
  usesGeometricDotPattern
} from "./elementProps";
import { LinearElementOverlay } from "./LinearElementOverlay";
import {
  getDecorativeStrokeOutline,
  getDecorativeStrokePath,
  isDecorativeStrokeStyle
} from "./decorativeStroke";
import {
  ARTIST_FILTER_BASE_SCALE,
  ARTIST_FILTER_MAX_SCALE,
  ARTIST_FILTER_MIN_SCALE,
  ARTIST_FILTER_STROKE_MULTIPLIER,
  BASE_FILL_PATTERN_SIZE,
  BASE_FILL_PATTERN_STROKE_WIDTH,
  CARTOONIST_FILTER_BASE_SCALE,
  CARTOONIST_FILTER_MAX_SCALE,
  CARTOONIST_FILTER_MIN_SCALE,
  CARTOONIST_FILTER_STROKE_MULTIPLIER,
  CARTOONIST_FILTER_VARIANT,
  CARTOONIST_FILTER_VARIANT_SEED_OFFSET,
  DEFAULT_FILL_STYLE,
  DEFAULT_FILL_WEIGHT,
  DEFAULT_FILTER_VARIANT,
  DEFAULT_SLOPPINESS,
  DEFAULT_SLOPPINESS_GAP,
  EMPTY_REPLACEMENT,
  FILL_PATTERN_ID_PREFIX,
  FILL_STYLE_CROSS_HATCH,
  FILL_STYLE_HACHURE,
  HACHURE_PATTERN_NEGATIVE_OFFSET_FACTOR,
  HACHURE_PATTERN_POSITIVE_OFFSET_FACTOR,
  HACHURE_PATTERN_TRAILING_END_FACTOR,
  HACHURE_PATTERN_TRAILING_START_FACTOR,
  HALF_DIVISOR,
  LINEAR_ELEMENT_SIMPLE_POINT_COUNT,
  MAX_FILL_WEIGHT,
  MIN_DOUBLE_STROKE_GAP,
  MIN_DOUBLE_STROKE_OFFSET,
  MIN_FILL_WEIGHT,
  MAX_FILL_PATTERN_STROKE_WIDTH,
  MIN_FILL_PATTERN_STROKE_WIDTH,
  MIN_RENDERED_STROKE_WIDTH,
  MIN_SHAPE_SIZE_AFTER_INSET,
  ROUNDED_EDGE_RADIUS,
  SECONDARY_HAND_DRAWN_INSET_MULTIPLIER,
  SECONDARY_SHAPE_MAX_INSET_MULTIPLIER,
  SECONDARY_STROKE_OPACITY_MULTIPLIER,
  SHARP_EDGE_RADIUS,
  SLOPPY_FILTER_BASE_FREQUENCY,
  SLOPPY_FILTER_BOUNDS,
  SLOPPY_FILTER_ID_PREFIX,
  SLOPPY_FILTER_NUM_OCTAVES,
  SLOPPY_FILTER_RESULT_ID,
  SLOPPY_FILTER_SIZE,
  SLOPPY_HASH_INITIAL_VALUE,
  SLOPPY_HASH_MODULUS,
  SLOPPY_HASH_MULTIPLIER,
  SLOPPINESS_ARTIST,
  SLOPPINESS_CARTOONIST,
  SLOPPINESS_DOUBLE,
  SVG_CHANNEL_GREEN,
  SVG_CHANNEL_RED,
  SVG_COMMAND_SEPARATOR,
  SVG_COORDINATE_SEPARATOR,
  SVG_FILL_NONE,
  SVG_FILTER_FRACTAL_NOISE,
  SVG_FILTER_SOURCE_GRAPHIC,
  SVG_ID_SAFE_PATTERN,
  SVG_LINE_COMMAND,
  SVG_LINECAP_ROUND,
  SVG_MOVE_COMMAND,
  SVG_PATH_CLOSE_COMMAND,
  SVG_POINTER_EVENTS_NONE,
  TEXT_BASELINE_OFFSET,
  TRANSPARENT_COLOR,
  ZERO_COORDINATE
} from "./renderingConstants";
import type { RenderElementOptions } from "./types";

const WIREFRAME_STROKE = "var(--kizkatt-wireframe-stroke)";
const WIREFRAME_STROKE_WIDTH = 1;

function hashElementId(id: string) {
  return id.split("").reduce((hash, character) => {
    return (
      (hash * SLOPPY_HASH_MULTIPLIER + character.charCodeAt(ZERO_COORDINATE)) %
      SLOPPY_HASH_MODULUS
    );
  }, SLOPPY_HASH_INITIAL_VALUE);
}

function getSloppyFilterId(
  element: KizkattElement,
  variant = DEFAULT_FILTER_VARIANT
) {
  return `${SLOPPY_FILTER_ID_PREFIX}-${variant}-${element.id.replace(
    SVG_ID_SAFE_PATTERN,
    EMPTY_REPLACEMENT
  )}`;
}

function getSloppiness(element: KizkattElement) {
  return element.sloppiness ?? DEFAULT_SLOPPINESS;
}

function getStrokeLineCount(element: KizkattElement) {
  if (Number.isFinite(element.strokeLineCount)) {
    return Math.min(10, Math.max(1, Math.floor(element.strokeLineCount ?? 1)));
  }

  const sloppiness = getSloppiness(element);

  return sloppiness === SLOPPINESS_CARTOONIST ||
    sloppiness === SLOPPINESS_DOUBLE
    ? 2
    : 1;
}

function getSecondaryStrokeIndices(element: KizkattElement) {
  return Array.from(
    { length: Math.max(0, getStrokeLineCount(element) - 1) },
    (_, index) => index + 1
  );
}

function getDecorativeStrokeStyle(element: KizkattElement) {
  return element.strokeStyle === "zigzag" && element.edgeStyle === "round"
    ? "wavy"
    : element.strokeStyle;
}

function shouldUseHandDrawnStroke(element: KizkattElement) {
  const sloppiness = getSloppiness(element);

  return sloppiness === SLOPPINESS_ARTIST || sloppiness === SLOPPINESS_CARTOONIST;
}

function getDoubleStrokeOffset(element: KizkattElement) {
  const strokeWidth = Math.max(MIN_RENDERED_STROKE_WIDTH, element.strokeWidth);
  const gap = Math.max(
    MIN_DOUBLE_STROKE_GAP,
    element.sloppinessGap ?? DEFAULT_SLOPPINESS_GAP
  );

  return Math.max(MIN_DOUBLE_STROKE_OFFSET, strokeWidth + gap);
}

function getSecondaryClosedShapeInset(
  element: KizkattElement,
  lineIndex: number
) {
  const sloppiness = getSloppiness(element);
  const offset = getDoubleStrokeOffset(element);
  const rawInset =
    sloppiness === SLOPPINESS_DOUBLE
      ? offset * lineIndex
      : offset * lineIndex * SECONDARY_HAND_DRAWN_INSET_MULTIPLIER;
  const maxInset = Math.max(
    MIN_SHAPE_SIZE_AFTER_INSET,
    Math.min(element.width, element.height) *
      SECONDARY_SHAPE_MAX_INSET_MULTIPLIER
  );

  return Math.min(rawInset, maxInset);
}

function getPrimaryShapeProps(element: KizkattElement) {
  const filter =
    shouldUseHandDrawnStroke(element) && !usesGeometricDotPattern(element)
      ? `url(#${getSloppyFilterId(element)})`
      : undefined;

  return {
    filter,
    ...getElementShapeProps(element)
  };
}

function getPrimaryBaseShapeProps(element: KizkattElement) {
  const shapeProps = getPrimaryShapeProps(element);

  return {
    ...shapeProps,
    "data-stroke-line-count": getStrokeLineCount(element),
    "data-stroke-style": element.strokeStyle,
    strokeOpacity: isDecorativeStrokeStyle(element.strokeStyle) ? 0 : undefined
  };
}

function getParallelDecorativeOutline(
  outline: NonNullable<ReturnType<typeof getDecorativeStrokeOutline>>,
  element: KizkattElement,
  lineIndex: number
) {
  if (lineIndex === 0) {
    return outline;
  }

  const offset = getDoubleStrokeOffset(element) * lineIndex;

  if (outline.closed) {
    const center = getElementCenter(element);
    const width = Math.max(MIN_SHAPE_SIZE_AFTER_INSET, Math.abs(element.width));
    const height = Math.max(
      MIN_SHAPE_SIZE_AFTER_INSET,
      Math.abs(element.height)
    );
    const scaleX = Math.max(
      MIN_SHAPE_SIZE_AFTER_INSET / width,
      (width - offset * HALF_DIVISOR) / width
    );
    const scaleY = Math.max(
      MIN_SHAPE_SIZE_AFTER_INSET / height,
      (height - offset * HALF_DIVISOR) / height
    );

    return {
      ...outline,
      points: outline.points.map((point) => ({
        x: center.x + (point.x - center.x) * scaleX,
        y: center.y + (point.y - center.y) * scaleY
      }))
    };
  }

  const start = outline.points[0];
  const end = outline.points[outline.points.length - 1];
  const length = Math.max(
    MIN_RENDERED_STROKE_WIDTH,
    Math.hypot(end.x - start.x, end.y - start.y)
  );
  const normal = {
    x: (-(end.y - start.y) / length) * offset,
    y: ((end.x - start.x) / length) * offset
  };

  return {
    ...outline,
    points: outline.points.map((point) => ({
      x: point.x + normal.x,
      y: point.y + normal.y
    }))
  };
}

function DecorativeStroke({
  element,
  linePoints
}: {
  element: KizkattElement;
  linePoints?: Array<{ x: number; y: number }>;
}) {
  const decorativeStyle = getDecorativeStrokeStyle(element);

  if (!isDecorativeStrokeStyle(decorativeStyle)) {
    return null;
  }

  const outline = getDecorativeStrokeOutline(element, linePoints);
  if (!outline) {
    return null;
  }

  return Array.from(
    { length: getStrokeLineCount(element) },
    (_, lineIndex) => lineIndex
  ).map((lineIndex) => {
    const pathData = getDecorativeStrokePath(
      getParallelDecorativeOutline(outline, element, lineIndex),
      decorativeStyle,
      element.strokeWidth
    );

    return pathData ? (
      <path
        key={lineIndex}
        data-decorative-stroke={decorativeStyle}
        d={pathData}
        fill={SVG_FILL_NONE}
        {...(lineIndex === 0
          ? getPrimaryShapeProps(element)
          : getSecondaryStrokeProps(element, lineIndex))}
      />
    ) : null;
  });
}

function Arrowhead({
  element,
  geometry
}: {
  element: KizkattElement;
  geometry: ArrowheadGeometry | null;
}) {
  if (!geometry) {
    return null;
  }

  const markerCoordinateSize = ARROW_MARKER_REF_Y * 2;
  const transform = `translate(${geometry.end.x} ${geometry.end.y}) rotate(${geometry.angle}) scale(${geometry.scaleX} ${geometry.scaleY}) translate(${-markerCoordinateSize} ${-ARROW_MARKER_REF_Y})`;

  if (geometry.style === "triangle") {
    return (
      <path
        data-arrowhead="true"
        data-arrowhead-endpoint={geometry.endpoint}
        data-arrowhead-style={geometry.style}
        data-arrowhead-angle={geometry.angle}
        data-arrowhead-base-x={geometry.base.x}
        data-arrowhead-base-y={geometry.base.y}
        data-arrowhead-scale-x={geometry.scaleX}
        data-arrowhead-scale-y={geometry.scaleY}
        data-decorative-arrowhead={
          isDecorativeStrokeStyle(element.strokeStyle) ? "true" : undefined
        }
        d={ARROW_MARKER_PATH}
        fill={element.strokeColor}
        opacity={element.opacity / PERCENT_MAX_VALUE}
        pointerEvents={SVG_POINTER_EVENTS_NONE}
        transform={transform}
      />
    );
  }

  const shape = geometry.style === "open" ? (
    <path
      d="M 0 0 L 10 5 L 0 10"
      fill={SVG_FILL_NONE}
      stroke={element.strokeColor}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      vectorEffect="non-scaling-stroke"
    />
  ) : geometry.style === "circle" ? (
    <circle cx="6" cy="5" r="4" fill={element.strokeColor} />
  ) : (
    <rect x="2" y="1" width="8" height="8" fill={element.strokeColor} />
  );

  return (
    <g
      data-arrowhead="true"
      data-arrowhead-endpoint={geometry.endpoint}
      data-arrowhead-style={geometry.style}
      data-arrowhead-angle={geometry.angle}
      data-arrowhead-base-x={geometry.base.x}
      data-arrowhead-base-y={geometry.base.y}
      data-arrowhead-scale-x={geometry.scaleX}
      data-arrowhead-scale-y={geometry.scaleY}
      data-decorative-arrowhead={
        isDecorativeStrokeStyle(element.strokeStyle) ? "true" : undefined
      }
      opacity={element.opacity / PERCENT_MAX_VALUE}
      pointerEvents={SVG_POINTER_EVENTS_NONE}
      transform={transform}
    >
      {shape}
    </g>
  );
}

function getSecondaryStrokeProps(
  element: KizkattElement,
  lineIndex: number
) {
  const filter =
    shouldUseHandDrawnStroke(element) &&
    !usesGeometricDotPattern(element)
      ? `url(#${getSloppyFilterId(element, CARTOONIST_FILTER_VARIANT)})`
      : undefined;

  return {
    "data-sloppiness-stroke": "secondary",
    "data-sloppiness-line": lineIndex,
    "data-sloppiness-spacing": getDoubleStrokeOffset(element) * lineIndex,
    ...getElementShapeProps(element),
    fill: SVG_FILL_NONE,
    filter,
    opacity:
      (element.opacity / PERCENT_MAX_VALUE) *
      SECONDARY_STROKE_OPACITY_MULTIPLIER,
    pointerEvents: SVG_POINTER_EVENTS_NONE
  };
}

function ElementSloppyFilter({
  element,
  variant = DEFAULT_FILTER_VARIANT
}: {
  element: KizkattElement;
  variant?: number;
}) {
  if (!shouldUseHandDrawnStroke(element)) {
    return null;
  }

  const seed =
    hashElementId(element.id) +
    variant * CARTOONIST_FILTER_VARIANT_SEED_OFFSET;
  const strokeWidth = Math.max(MIN_RENDERED_STROKE_WIDTH, element.strokeWidth);
  const scale =
    getSloppiness(element) === SLOPPINESS_CARTOONIST
      ? Math.max(
          CARTOONIST_FILTER_MIN_SCALE,
          Math.min(
            CARTOONIST_FILTER_MAX_SCALE,
            CARTOONIST_FILTER_BASE_SCALE +
              Math.sqrt(strokeWidth) * CARTOONIST_FILTER_STROKE_MULTIPLIER
          )
        )
      : Math.max(
          ARTIST_FILTER_MIN_SCALE,
          Math.min(
            ARTIST_FILTER_MAX_SCALE,
            ARTIST_FILTER_BASE_SCALE +
              Math.sqrt(strokeWidth) * ARTIST_FILTER_STROKE_MULTIPLIER
          )
        );

  return (
    <defs>
      <filter
        id={getSloppyFilterId(element, variant)}
        x={SLOPPY_FILTER_BOUNDS}
        y={SLOPPY_FILTER_BOUNDS}
        width={SLOPPY_FILTER_SIZE}
        height={SLOPPY_FILTER_SIZE}
      >
        <feTurbulence
          type={SVG_FILTER_FRACTAL_NOISE}
          baseFrequency={SLOPPY_FILTER_BASE_FREQUENCY}
          numOctaves={SLOPPY_FILTER_NUM_OCTAVES}
          seed={seed}
          result={SLOPPY_FILTER_RESULT_ID}
        />
        <feDisplacementMap
          in={SVG_FILTER_SOURCE_GRAPHIC}
          in2={SLOPPY_FILTER_RESULT_ID}
          scale={scale}
          xChannelSelector={SVG_CHANNEL_RED}
          yChannelSelector={SVG_CHANNEL_GREEN}
        />
      </filter>
    </defs>
  );
}

function getFillPatternId(element: KizkattElement) {
  return `${FILL_PATTERN_ID_PREFIX}-${element.id.replace(
    SVG_ID_SAFE_PATTERN,
    EMPTY_REPLACEMENT
  )}`;
}

function getElementFill(element: KizkattElement) {
  if ((element.fillStyle ?? DEFAULT_FILL_STYLE) === DEFAULT_FILL_STYLE) {
    return element.backgroundColor;
  }

  return `url(#${getFillPatternId(element)})`;
}

function getInlineSvgFill(element: KizkattElement) {
  return element.backgroundColor === TRANSPARENT_COLOR
    ? SVG_FILL_NONE
    : getElementFill(element);
}

function InlineSvgObject({
  element,
  wireframe = false
}: {
  element: KizkattElement;
  wireframe?: boolean;
}) {
  const fill = getInlineSvgFill(element);
  const shapeProps = getElementShapeProps(element);
  const useElementStyle = element.svgUseElementStyle ?? true;
  const style = {
    "--kizkatt-inline-svg-fill": fill,
    "--kizkatt-inline-svg-stroke": element.strokeColor,
    "--kizkatt-inline-svg-stroke-dasharray":
      shapeProps.strokeDasharray ?? "none",
    "--kizkatt-inline-svg-stroke-width": `${element.strokeWidth}`
  } as CSSProperties;

  return (
    <svg
      className={[
        "kizkatt-inline-svg-object",
        wireframe ? "is-wireframe" : "",
        useElementStyle ? "is-style-editing" : "",
        element.backgroundColor === TRANSPARENT_COLOR ? "" : "is-fill-editing"
      ]
        .filter(Boolean)
        .join(" ")}
      color={wireframe ? WIREFRAME_STROKE : element.strokeColor}
      fill={wireframe ? SVG_FILL_NONE : fill}
      height={element.height}
      opacity={wireframe ? 1 : element.opacity / PERCENT_MAX_VALUE}
      preserveAspectRatio="none"
      stroke={wireframe ? WIREFRAME_STROKE : element.strokeColor}
      strokeDasharray={wireframe ? undefined : shapeProps.strokeDasharray}
      strokeLinecap={shapeProps.strokeLinecap}
      strokeLinejoin={shapeProps.strokeLinejoin}
      strokeWidth={wireframe ? 1 : element.strokeWidth}
      style={style}
      viewBox={element.svgViewBox ?? `0 0 ${element.width} ${element.height}`}
      width={element.width}
      x={element.x}
      y={element.y}
      dangerouslySetInnerHTML={{ __html: element.svgContent ?? "" }}
    />
  );
}

function ElementFillPattern({ element }: { element: KizkattElement }) {
  const fillStyle = element.fillStyle ?? DEFAULT_FILL_STYLE;

  if (fillStyle === DEFAULT_FILL_STYLE) {
    return null;
  }

  const patternId = getFillPatternId(element);
  const patternStroke =
    element.backgroundColor === TRANSPARENT_COLOR
      ? element.strokeColor
      : element.backgroundColor;
  const fillWeight = Math.max(
    MIN_FILL_WEIGHT,
    Math.min(MAX_FILL_WEIGHT, element.fillWeight ?? DEFAULT_FILL_WEIGHT)
  );
  const patternSize = BASE_FILL_PATTERN_SIZE / fillWeight;
  const patternStrokeWidth = Math.max(
    MIN_FILL_PATTERN_STROKE_WIDTH,
    Math.min(
      MAX_FILL_PATTERN_STROKE_WIDTH,
      BASE_FILL_PATTERN_STROKE_WIDTH * Math.sqrt(fillWeight)
    )
  );
  const hachurePath = [
    `${SVG_MOVE_COMMAND} ${
      patternSize * HACHURE_PATTERN_NEGATIVE_OFFSET_FACTOR
    } ${patternSize * HACHURE_PATTERN_POSITIVE_OFFSET_FACTOR}`,
    `${SVG_LINE_COMMAND} ${
      patternSize * HACHURE_PATTERN_POSITIVE_OFFSET_FACTOR
    } ${patternSize * HACHURE_PATTERN_NEGATIVE_OFFSET_FACTOR}`,
    `${SVG_MOVE_COMMAND} ${ZERO_COORDINATE} ${patternSize}`,
    `${SVG_LINE_COMMAND} ${patternSize} ${ZERO_COORDINATE}`,
    `${SVG_MOVE_COMMAND} ${
      patternSize * HACHURE_PATTERN_TRAILING_START_FACTOR
    } ${patternSize * HACHURE_PATTERN_TRAILING_END_FACTOR}`,
    `${SVG_LINE_COMMAND} ${
      patternSize * HACHURE_PATTERN_TRAILING_END_FACTOR
    } ${patternSize * HACHURE_PATTERN_TRAILING_START_FACTOR}`
  ].join(SVG_COMMAND_SEPARATOR);
  const crossHatchPath = [
    `${SVG_MOVE_COMMAND} ${ZERO_COORDINATE} ${ZERO_COORDINATE}`,
    `${SVG_LINE_COMMAND} ${patternSize} ${patternSize}`,
    `${SVG_MOVE_COMMAND} ${ZERO_COORDINATE} ${patternSize}`,
    `${SVG_LINE_COMMAND} ${patternSize} ${ZERO_COORDINATE}`
  ].join(SVG_COMMAND_SEPARATOR);
  const reverseLine =
    fillStyle === FILL_STYLE_CROSS_HATCH ? (
      <path d={crossHatchPath} />
    ) : null;

  return (
    <defs>
      <pattern
        id={patternId}
        width={patternSize}
        height={patternSize}
        patternUnits="userSpaceOnUse"
        patternTransform={`translate(${element.x} ${element.y})`}
      >
        {fillStyle === FILL_STYLE_HACHURE ? <path d={hachurePath} /> : null}
        {reverseLine}
      </pattern>
      <style>{`
        #${patternId} path {
          stroke: ${patternStroke};
          stroke-width: ${patternStrokeWidth};
          stroke-linecap: ${SVG_LINECAP_ROUND};
        }
      `}</style>
    </defs>
  );
}

function SelectedElementOverlay({
  element,
  options
}: {
  element: KizkattElement;
  options: RenderElementOptions;
}) {
  return (
    <ElementOverlay
      element={element}
      selectionTransformCenter={options.selectionTransformCenter}
      selectionTransformMode={options.selectionTransformMode}
      showBounds={options.showSelectionBounds ?? true}
      showRotateHoverIcon={options.showRotateHoverIcon ?? true}
      showRotateHandle={options.showRotateHandle ?? true}
    />
  );
}

function SecondaryRectStroke({ element }: { element: KizkattElement }) {
  if (
    isDecorativeStrokeStyle(element.strokeStyle) ||
    getStrokeLineCount(element) <= 1
  ) {
    return null;
  }
  const edgeRadius =
    (element.edgeStyle ?? SVG_LINECAP_ROUND) === SVG_LINECAP_ROUND
      ? ROUNDED_EDGE_RADIUS
      : SHARP_EDGE_RADIUS;

  return getSecondaryStrokeIndices(element).map((lineIndex) => {
    const inset = getSecondaryClosedShapeInset(element, lineIndex);

    return (
      <rect
        key={lineIndex}
        x={element.x + inset}
        y={element.y + inset}
        width={Math.max(
          MIN_SHAPE_SIZE_AFTER_INSET,
          element.width - inset * HALF_DIVISOR
        )}
        height={Math.max(
          MIN_SHAPE_SIZE_AFTER_INSET,
          element.height - inset * HALF_DIVISOR
        )}
        rx={Math.max(SHARP_EDGE_RADIUS, edgeRadius - inset)}
        {...getSecondaryStrokeProps(element, lineIndex)}
      />
    );
  });
}

function SecondaryDiamondStroke({ element }: { element: KizkattElement }) {
  if (
    isDecorativeStrokeStyle(element.strokeStyle) ||
    getStrokeLineCount(element) <= 1
  ) {
    return null;
  }

  const center = getElementCenter(element);

  return getSecondaryStrokeIndices(element).map((lineIndex) => {
    const inset = getSecondaryClosedShapeInset(element, lineIndex);
    const halfWidth = Math.max(
      MIN_SHAPE_SIZE_AFTER_INSET,
      element.width / HALF_DIVISOR - inset
    );
    const halfHeight = Math.max(
      MIN_SHAPE_SIZE_AFTER_INSET,
      element.height / HALF_DIVISOR - inset
    );
    const points = [
      `${center.x}${SVG_COORDINATE_SEPARATOR}${center.y - halfHeight}`,
      `${center.x + halfWidth}${SVG_COORDINATE_SEPARATOR}${center.y}`,
      `${center.x}${SVG_COORDINATE_SEPARATOR}${center.y + halfHeight}`,
      `${center.x - halfWidth}${SVG_COORDINATE_SEPARATOR}${center.y}`
    ].join(SVG_COMMAND_SEPARATOR);

    return (
      <polygon
        key={lineIndex}
        points={points}
        {...getSecondaryStrokeProps(element, lineIndex)}
      />
    );
  });
}

function SecondaryEllipseStroke({ element }: { element: KizkattElement }) {
  if (
    isDecorativeStrokeStyle(element.strokeStyle) ||
    getStrokeLineCount(element) <= 1
  ) {
    return null;
  }

  return getSecondaryStrokeIndices(element).map((lineIndex) => {
    const inset = getSecondaryClosedShapeInset(element, lineIndex);

    return (
      <ellipse
        key={lineIndex}
        cx={element.x + element.width / HALF_DIVISOR}
        cy={element.y + element.height / HALF_DIVISOR}
        rx={Math.max(
          MIN_SHAPE_SIZE_AFTER_INSET,
          Math.abs(element.width / HALF_DIVISOR) - inset
        )}
        ry={Math.max(
          MIN_SHAPE_SIZE_AFTER_INSET,
          Math.abs(element.height / HALF_DIVISOR) - inset
        )}
        {...getSecondaryStrokeProps(element, lineIndex)}
      />
    );
  });
}

function getLineOffsetPoints(
  element: KizkattElement,
  linePoints: Array<{ x: number; y: number }>,
  lineIndex: number
) {
  const offset = getDoubleStrokeOffset(element) * lineIndex;
  const start = linePoints[0];
  const end = linePoints[linePoints.length - 1];
  const length =
    Math.hypot(end.x - start.x, end.y - start.y) ||
    MIN_RENDERED_STROKE_WIDTH;
  const normal = {
    x: (-(end.y - start.y) / length) * offset,
    y: ((end.x - start.x) / length) * offset
  };

  return {
    x1: start.x + normal.x,
    x2: end.x + normal.x,
    y1: start.y + normal.y,
    y2: end.y + normal.y
  };
}

function SecondaryLineStroke({
  element,
  linePoints
}: {
  element: KizkattElement;
  linePoints: Array<{ x: number; y: number }>;
}) {
  if (
    isDecorativeStrokeStyle(element.strokeStyle) ||
    getStrokeLineCount(element) <= 1
  ) {
    return null;
  }

  return getSecondaryStrokeIndices(element).map((lineIndex) => {
    const secondaryProps = getSecondaryStrokeProps(element, lineIndex);

    if (linePoints.length > LINEAR_ELEMENT_SIMPLE_POINT_COUNT) {
      const offset = getDoubleStrokeOffset(element) * lineIndex;
      const d = getLinearElementPath(
        linePoints.map((point) => ({
          x: point.x,
          y: point.y + offset
        })),
        element.edgeStyle
      );

      return <path key={lineIndex} d={d} {...secondaryProps} />;
    }

    return (
      <line
        key={lineIndex}
        {...getLineOffsetPoints(element, linePoints, lineIndex)}
        {...secondaryProps}
      />
    );
  });
}

function SecondaryFreehandStroke({ element }: { element: KizkattElement }) {
  if (
    isDecorativeStrokeStyle(element.strokeStyle) ||
    getStrokeLineCount(element) <= 1
  ) {
    return null;
  }

  return getSecondaryStrokeIndices(element).map((lineIndex) => {
    const offset = getDoubleStrokeOffset(element) * lineIndex;
    const d = element.pathData
      ? getFreehandPath({ ...element, y: element.y + offset })
      : (element.points ?? [])
          .map((point, index) => {
            const command =
              index === ZERO_COORDINATE ? SVG_MOVE_COMMAND : SVG_LINE_COMMAND;

            return `${command} ${element.x + point.x} ${
              element.y + point.y + offset
            }`;
          })
          .join(SVG_COMMAND_SEPARATOR);

    return (
      <path
        key={lineIndex}
        d={d}
        {...getSecondaryStrokeProps(element, lineIndex)}
      />
    );
  });
}

export function renderElementOverlay(
  element: KizkattElement,
  options: RenderElementOptions = {}
) {
  const isInternalOverlay = options.overlayVariant === "internal";
  const isNodeEditMode = options.linearEndpointMode === "node";
  const isSkewMode =
    options.selectionTransformMode === "skew" && !isNodeEditMode;

  if (!isInternalOverlay && isSkewMode) {
    return (
      <WorldSkewOverlay
        key={`overlay-${element.id}`}
        center={options.selectionTransformCenter ?? getElementCenter(element)}
        points={getElementTransformedCorners(element)}
      />
    );
  }

  if (
    !isInternalOverlay &&
    element.type !== "line" &&
    element.type !== "arrow"
  ) {
    return (
      <WorldResizeOverlay
        key={`overlay-${element.id}`}
        center={options.selectionTransformCenter}
        element={element}
      />
    );
  }

  if (isInternalOverlay) {
    return (
      <g
        key={`overlay-${element.id}`}
        className="kizkatt-element-overlay-layer"
        data-element-overlay-id={element.id}
        data-element-overlay-variant="internal"
        transform={getElementTransform(element)}
      >
        <ElementOverlay
            element={element}
            internal
            selectionTransformCenter={options.selectionTransformCenter}
            selectionTransformMode={options.selectionTransformMode}
          showBounds={options.showSelectionBounds ?? true}
          showResizeHandles={false}
          showRotateHandle={false}
        />
      </g>
    );
  }

  if (element.type === "line" || element.type === "arrow") {
    const bends = getElementBends(element);
    const linePoints = getLinearElementPoints(element, bends);
    const hasBends = bends.length > ZERO_COORDINATE;

    return (
      <g
        key={`overlay-${element.id}`}
        className="kizkatt-element-overlay-layer"
        data-element-overlay-id={element.id}
        data-element-overlay-variant="primary"
        transform={getElementTransform(element)}
      >
        {!isNodeEditMode && (hasBends || isSkewMode) ? (
          <ElementOverlay
            element={element}
            selectionTransformCenter={options.selectionTransformCenter}
            selectionTransformMode={options.selectionTransformMode}
            showBounds={options.showSelectionBounds ?? true}
            showRotateHoverIcon={options.showRotateHoverIcon ?? true}
            showRotateHandle={options.showRotateHandle ?? true}
          />
        ) : null}
        {!isSkewMode && (
          <LinearElementOverlay
            element={element}
            bends={bends}
            endpointMode={options.linearEndpointMode}
            linePoints={linePoints}
            selectedBendIndex={options.selectedBendIndex}
            showBounds={options.showSelectionBounds ?? true}
            showBendHandles={options.showLinearBendHandles ?? true}
            showRotateHoverIcon={options.showRotateHoverIcon ?? true}
            showRotateHandle={!hasBends && (options.showRotateHandle ?? true)}
          />
        )}
      </g>
    );
  }

  return (
    <g
      key={`overlay-${element.id}`}
      className="kizkatt-element-overlay-layer"
      data-element-overlay-id={element.id}
      data-element-overlay-variant="primary"
      transform={getElementTransform(element)}
    >
      <SelectedElementOverlay element={element} options={options} />
    </g>
  );
}

function WireframeArrowhead({ geometry }: { geometry: ArrowheadGeometry | null }) {
  if (!geometry) {
    return null;
  }

  const markerCoordinateSize = ARROW_MARKER_REF_Y * 2;

  const shape = geometry.style === "circle" ? (
    <circle cx="6" cy="5" r="4" />
  ) : geometry.style === "square" ? (
    <rect x="2" y="1" width="8" height="8" />
  ) : (
    <path
      d={
        geometry.style === "triangle"
          ? ARROW_MARKER_PATH
          : "M 0 0 L 10 5 L 0 10"
      }
    />
  );

  return (
    <g
      data-wireframe-arrowhead="true"
      data-arrowhead-endpoint={geometry.endpoint}
      fill={SVG_FILL_NONE}
      stroke={WIREFRAME_STROKE}
      strokeWidth={WIREFRAME_STROKE_WIDTH}
      vectorEffect="non-scaling-stroke"
      pointerEvents={SVG_POINTER_EVENTS_NONE}
      transform={`translate(${geometry.end.x} ${geometry.end.y}) rotate(${geometry.angle}) scale(${geometry.scaleX} ${geometry.scaleY}) translate(${-markerCoordinateSize} ${-ARROW_MARKER_REF_Y})`}
    >
      {shape}
    </g>
  );
}

function WireframeElement({
  element,
  options,
  selected
}: {
  element: KizkattElement;
  options: RenderElementOptions;
  selected: boolean;
}) {
  const shapeProps = {
    fill: SVG_FILL_NONE,
    stroke: WIREFRAME_STROKE,
    strokeDasharray: undefined,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: WIREFRAME_STROKE_WIDTH,
    vectorEffect: "non-scaling-stroke" as const
  };
  let shape: ReactNode;

  if (element.type === "image") {
    shape = element.svgContent ? (
      <InlineSvgObject element={element} wireframe />
    ) : (
      <>
        <rect
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          {...shapeProps}
        />
        <line
          x1={element.x}
          y1={element.y}
          x2={element.x + element.width}
          y2={element.y + element.height}
          {...shapeProps}
        />
        <line
          x1={element.x + element.width}
          y1={element.y}
          x2={element.x}
          y2={element.y + element.height}
          {...shapeProps}
        />
      </>
    );
  } else if (element.type === "rectangle") {
    shape = (
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        {...shapeProps}
      />
    );
  } else if (element.type === "diamond") {
    const center = getElementCenter(element);
    const points = [
      `${center.x}${SVG_COORDINATE_SEPARATOR}${element.y}`,
      `${element.x + element.width}${SVG_COORDINATE_SEPARATOR}${center.y}`,
      `${center.x}${SVG_COORDINATE_SEPARATOR}${element.y + element.height}`,
      `${element.x}${SVG_COORDINATE_SEPARATOR}${center.y}`
    ].join(SVG_COMMAND_SEPARATOR);

    shape = <polygon points={points} {...shapeProps} />;
  } else if (element.type === "ellipse") {
    shape = (
      <ellipse
        cx={element.x + element.width / HALF_DIVISOR}
        cy={element.y + element.height / HALF_DIVISOR}
        rx={Math.abs(element.width / HALF_DIVISOR)}
        ry={Math.abs(element.height / HALF_DIVISOR)}
        {...shapeProps}
      />
    );
  } else if (element.type === "line" || element.type === "arrow") {
    const linePoints = getLinearElementPoints(element, getElementBends(element));
    const startArrowheadGeometry = getArrowheadGeometry(
      { ...element, strokeWidth: WIREFRAME_STROKE_WIDTH },
      linePoints,
      "start"
    );
    const endArrowheadGeometry = getArrowheadGeometry(
      { ...element, strokeWidth: WIREFRAME_STROKE_WIDTH },
      linePoints,
      "end"
    );
    const renderedLinePoints = shortenLinePointsForArrowheads(
      linePoints,
      startArrowheadGeometry,
      endArrowheadGeometry
    );
    const canUseFill = canElementUseBackground(element);
    const pathData = getLinearElementPath(renderedLinePoints, element.edgeStyle);

    shape = (
      <>
        <path
          d={`${pathData}${canUseFill ? SVG_PATH_CLOSE_COMMAND : ""}`}
          {...shapeProps}
        />
        <WireframeArrowhead geometry={startArrowheadGeometry} />
        <WireframeArrowhead geometry={endArrowheadGeometry} />
      </>
    );
  } else if (element.type === "draw") {
    const pathData = getFreehandPath(element);

    shape = (
      <path
        d={`${pathData}${isElementPathClosed(element) ? SVG_PATH_CLOSE_COMMAND : ""}`}
        {...shapeProps}
      />
    );
  } else {
    shape = (
      <text
        x={element.x}
        y={element.y + TEXT_BASELINE_OFFSET}
        className="kizkatt-text"
        fill={WIREFRAME_STROKE}
      >
        {element.text}
      </text>
    );
  }

  return (
    <ElementGroup element={element}>
      <g data-wireframe-element="true">{shape}</g>
      {selected && <SelectedElementOverlay element={element} options={options} />}
    </ElementGroup>
  );
}

export function renderElement(
  element: KizkattElement,
  selected: boolean,
  options: RenderElementOptions = {}
) {
  if (options.wireframe) {
    return (
      <WireframeElement
        element={element}
        options={options}
        selected={selected}
      />
    );
  }

  const commonProps = getPrimaryBaseShapeProps(element);
  const edgeRadius =
    (element.edgeStyle ?? SVG_LINECAP_ROUND) === SVG_LINECAP_ROUND
      ? ROUNDED_EDGE_RADIUS
      : SHARP_EDGE_RADIUS;

  if (element.type === "rectangle") {
    return (
      <ElementGroup key={element.id} element={element}>
        <ElementFillPattern element={element} />
        <ElementSloppyFilter element={element} />
        <ElementSloppyFilter
          element={element}
          variant={CARTOONIST_FILTER_VARIANT}
        />
        {element.strokeBehindFill && <DecorativeStroke element={element} />}
        {element.strokeBehindFill && <SecondaryRectStroke element={element} />}
        <rect
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          rx={edgeRadius}
          fill={getElementFill(element)}
          {...commonProps}
        />
        {!element.strokeBehindFill && <DecorativeStroke element={element} />}
        {!element.strokeBehindFill && <SecondaryRectStroke element={element} />}
        {selected && <SelectedElementOverlay element={element} options={options} />}
      </ElementGroup>
    );
  }

  if (element.type === "image") {
    const borderElement = {
      ...element,
      strokeWidth: element.imageBorderEnabled ? element.strokeWidth : 0
    };
    const borderProps = getPrimaryBaseShapeProps(borderElement);
    const imageContent = element.svgContent ? (
      <InlineSvgObject element={element} />
    ) : element.src ? (
      <image
        href={element.src}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        preserveAspectRatio="none"
        opacity={element.opacity / PERCENT_MAX_VALUE}
      />
    ) : (
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rx={edgeRadius}
        fill={getElementFill(element)}
        stroke={SVG_FILL_NONE}
        opacity={element.opacity / PERCENT_MAX_VALUE}
      />
    );
    const imageBorder = (
      <>
        <rect
          data-image-border="true"
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          rx={edgeRadius}
          fill={SVG_FILL_NONE}
          {...borderProps}
        />
        <DecorativeStroke element={borderElement} />
        <SecondaryRectStroke element={borderElement} />
      </>
    );

    return (
      <ElementGroup key={element.id} element={element}>
        <ElementFillPattern element={element} />
        <ElementSloppyFilter element={borderElement} />
        <ElementSloppyFilter
          element={borderElement}
          variant={CARTOONIST_FILTER_VARIANT}
        />
        {element.strokeBehindFill && imageBorder}
        {imageContent}
        {!element.strokeBehindFill && imageBorder}
        {selected && <SelectedElementOverlay element={element} options={options} />}
      </ElementGroup>
    );
  }

  if (element.type === "diamond") {
    const center = getElementCenter(element);
    const points = [
      `${center.x}${SVG_COORDINATE_SEPARATOR}${element.y}`,
      `${element.x + element.width}${SVG_COORDINATE_SEPARATOR}${center.y}`,
      `${center.x}${SVG_COORDINATE_SEPARATOR}${element.y + element.height}`,
      `${element.x}${SVG_COORDINATE_SEPARATOR}${center.y}`
    ].join(SVG_COMMAND_SEPARATOR);

    return (
      <ElementGroup key={element.id} element={element}>
        <ElementFillPattern element={element} />
        <ElementSloppyFilter element={element} />
        <ElementSloppyFilter
          element={element}
          variant={CARTOONIST_FILTER_VARIANT}
        />
        {element.strokeBehindFill && <DecorativeStroke element={element} />}
        {element.strokeBehindFill && (
          <SecondaryDiamondStroke element={element} />
        )}
        <polygon points={points} fill={getElementFill(element)} {...commonProps} />
        {!element.strokeBehindFill && <DecorativeStroke element={element} />}
        {!element.strokeBehindFill && (
          <SecondaryDiamondStroke element={element} />
        )}
        {selected && <SelectedElementOverlay element={element} options={options} />}
      </ElementGroup>
    );
  }

  if (element.type === "ellipse") {
    return (
      <ElementGroup key={element.id} element={element}>
        <ElementFillPattern element={element} />
        <ElementSloppyFilter element={element} />
        <ElementSloppyFilter
          element={element}
          variant={CARTOONIST_FILTER_VARIANT}
        />
        {element.strokeBehindFill && <DecorativeStroke element={element} />}
        {element.strokeBehindFill && <SecondaryEllipseStroke element={element} />}
        <ellipse
          cx={element.x + element.width / HALF_DIVISOR}
          cy={element.y + element.height / HALF_DIVISOR}
          rx={Math.abs(element.width / HALF_DIVISOR)}
          ry={Math.abs(element.height / HALF_DIVISOR)}
          fill={getElementFill(element)}
          {...commonProps}
        />
        {!element.strokeBehindFill && <DecorativeStroke element={element} />}
        {!element.strokeBehindFill && (
          <SecondaryEllipseStroke element={element} />
        )}
        {selected && <SelectedElementOverlay element={element} options={options} />}
      </ElementGroup>
    );
  }

  if (element.type === "line" || element.type === "arrow") {
    const bends = getElementBends(element);
    const linePoints = getLinearElementPoints(element, bends);
    const startArrowheadGeometry = getArrowheadGeometry(
      element,
      linePoints,
      "start"
    );
    const endArrowheadGeometry = getArrowheadGeometry(
      element,
      linePoints,
      "end"
    );
    const renderedLinePoints = shortenLinePointsForArrowheads(
      linePoints,
      startArrowheadGeometry,
      endArrowheadGeometry
    );
    const renderedStart = renderedLinePoints[0];
    const renderedEnd = renderedLinePoints[renderedLinePoints.length - 1];
    const hasBends = bends.length > ZERO_COORDINATE;
    const isNodeEditMode = options.linearEndpointMode === "node";
    const isSkewMode =
      options.selectionTransformMode === "skew" && !isNodeEditMode;
    const canUseFill = canElementUseBackground(element);
    const pathData = getLinearElementPath(
      renderedLinePoints,
      element.edgeStyle
    );
    return (
      <ElementGroup key={element.id} element={element}>
        {canUseFill && <ElementFillPattern element={element} />}
        <ElementSloppyFilter element={element} />
        <ElementSloppyFilter
          element={element}
          variant={CARTOONIST_FILTER_VARIANT}
        />
        {canUseFill && element.strokeBehindFill && (
          <DecorativeStroke
            element={element}
            linePoints={renderedLinePoints}
          />
        )}
        {canUseFill && element.strokeBehindFill && (
          <SecondaryLineStroke
            element={element}
            linePoints={renderedLinePoints}
          />
        )}
        {hasBends || canUseFill ? (
          <path
            d={`${pathData}${canUseFill ? SVG_PATH_CLOSE_COMMAND : ""}`}
            fill={canUseFill ? getElementFill(element) : SVG_FILL_NONE}
            {...commonProps}
          />
        ) : (
          <line
            x1={renderedStart.x}
            y1={renderedStart.y}
            x2={renderedEnd.x}
            y2={renderedEnd.y}
            fill={SVG_FILL_NONE}
            {...commonProps}
          />
        )}
        {(!canUseFill || !element.strokeBehindFill) && (
          <DecorativeStroke
            element={element}
            linePoints={renderedLinePoints}
          />
        )}
        <Arrowhead
          element={element}
          geometry={startArrowheadGeometry}
        />
        <Arrowhead
          element={element}
          geometry={endArrowheadGeometry}
        />
        {(!canUseFill || !element.strokeBehindFill) && (
          <SecondaryLineStroke
            element={element}
            linePoints={renderedLinePoints}
          />
        )}
        {selected && (
          <>
            {!isNodeEditMode && (hasBends || isSkewMode) ? (
              <ElementOverlay
                element={element}
                selectionTransformCenter={options.selectionTransformCenter}
                selectionTransformMode={options.selectionTransformMode}
                showBounds={options.showSelectionBounds ?? true}
                showRotateHandle={options.showRotateHandle ?? true}
              />
            ) : null}
            {!isSkewMode && (
              <LinearElementOverlay
                element={element}
                bends={bends}
                endpointMode={options.linearEndpointMode}
                linePoints={linePoints}
                selectedBendIndex={options.selectedBendIndex}
                showBounds={options.showSelectionBounds ?? true}
                showBendHandles={options.showLinearBendHandles ?? true}
                showRotateHandle={!hasBends && (options.showRotateHandle ?? true)}
              />
            )}
          </>
        )}
      </ElementGroup>
    );
  }

  if (element.type === "draw") {
    const canUseFill = isElementPathClosed(element);
    const freehandPath = getFreehandPath(element);

    return (
      <ElementGroup key={element.id} element={element}>
        {canUseFill && <ElementFillPattern element={element} />}
        <ElementSloppyFilter element={element} />
        <ElementSloppyFilter
          element={element}
          variant={CARTOONIST_FILTER_VARIANT}
        />
        {canUseFill && element.strokeBehindFill && (
          <DecorativeStroke element={element} />
        )}
        {canUseFill && element.strokeBehindFill && (
          <SecondaryFreehandStroke element={element} />
        )}
        <path
          d={`${freehandPath}${canUseFill ? SVG_PATH_CLOSE_COMMAND : ""}`}
          fill={canUseFill ? getElementFill(element) : SVG_FILL_NONE}
          {...commonProps}
        />
        {(!canUseFill || !element.strokeBehindFill) && (
          <DecorativeStroke element={element} />
        )}
        {(!canUseFill || !element.strokeBehindFill) && (
          <SecondaryFreehandStroke element={element} />
        )}
        {selected && <SelectedElementOverlay element={element} options={options} />}
      </ElementGroup>
    );
  }

  return (
    <ElementGroup key={element.id} element={element}>
      <text
        x={element.x}
        y={element.y + TEXT_BASELINE_OFFSET}
        className="kizkatt-text"
        fill={element.strokeColor}
            opacity={element.opacity / PERCENT_MAX_VALUE}
      >
        {element.text}
      </text>
      {selected && <SelectedElementOverlay element={element} options={options} />}
    </ElementGroup>
  );
}
