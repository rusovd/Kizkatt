import type { CSSProperties } from "react";

import {
  getElementBends,
  getElementCenter,
  getLinearElementPath,
  getLinearElementPoints
} from "../../geometry";
import { canElementUseBackground, isElementPathClosed } from "../../model/element";
import type { KizkattElement } from "../../model/types";
import { PERCENT_MAX_VALUE } from "../../config/constants";
import { ElementGroup } from "./ElementGroup";
import { ElementOverlay } from "./ElementOverlay";
import {
  getElementShapeProps,
  getElementTransform,
  getFreehandPath
} from "./elementProps";
import { LinearElementOverlay } from "./LinearElementOverlay";
import {
  ARROW_MARKER_URL,
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

function getSecondaryClosedShapeInset(element: KizkattElement) {
  const sloppiness = getSloppiness(element);
  const offset = getDoubleStrokeOffset(element);
  const rawInset =
    sloppiness === SLOPPINESS_DOUBLE
      ? offset
      : offset * SECONDARY_HAND_DRAWN_INSET_MULTIPLIER;
  const maxInset = Math.max(
    MIN_SHAPE_SIZE_AFTER_INSET,
    Math.min(element.width, element.height) *
      SECONDARY_SHAPE_MAX_INSET_MULTIPLIER
  );

  return Math.min(rawInset, maxInset);
}

function getPrimaryShapeProps(element: KizkattElement) {
  const filter = shouldUseHandDrawnStroke(element)
    ? `url(#${getSloppyFilterId(element)})`
    : undefined;

  return {
    filter,
    ...getElementShapeProps(element)
  };
}

function getSecondaryStrokeProps(
  element: KizkattElement,
  variant: number
) {
  const filter =
    getSloppiness(element) === SLOPPINESS_CARTOONIST
      ? `url(#${getSloppyFilterId(element, variant)})`
      : undefined;

  return {
    "data-sloppiness-stroke": "secondary",
    "data-sloppiness-spacing": getDoubleStrokeOffset(element),
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

function InlineSvgObject({ element }: { element: KizkattElement }) {
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
        useElementStyle ? "is-style-editing" : "",
        element.backgroundColor === TRANSPARENT_COLOR ? "" : "is-fill-editing"
      ]
        .filter(Boolean)
        .join(" ")}
      color={element.strokeColor}
      fill={fill}
      height={element.height}
      opacity={element.opacity / PERCENT_MAX_VALUE}
      preserveAspectRatio="xMidYMid meet"
      stroke={element.strokeColor}
      strokeDasharray={shapeProps.strokeDasharray}
      strokeLinecap={shapeProps.strokeLinecap}
      strokeLinejoin={shapeProps.strokeLinejoin}
      strokeWidth={element.strokeWidth}
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
      showBounds={options.showSelectionBounds ?? true}
      showRotateHoverIcon={options.showRotateHoverIcon ?? true}
      showRotateHandle={options.showRotateHandle ?? true}
    />
  );
}

function SecondaryRectStroke({ element }: { element: KizkattElement }) {
  const sloppiness = getSloppiness(element);

  if (
    sloppiness !== SLOPPINESS_CARTOONIST &&
    sloppiness !== SLOPPINESS_DOUBLE
  ) {
    return null;
  }

  const inset = getSecondaryClosedShapeInset(element);
  const edgeRadius =
    (element.edgeStyle ?? SVG_LINECAP_ROUND) === SVG_LINECAP_ROUND
      ? ROUNDED_EDGE_RADIUS
      : SHARP_EDGE_RADIUS;

  return (
    <rect
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
      {...getSecondaryStrokeProps(element, CARTOONIST_FILTER_VARIANT)}
    />
  );
}

function SecondaryDiamondStroke({ element }: { element: KizkattElement }) {
  const sloppiness = getSloppiness(element);

  if (
    sloppiness !== SLOPPINESS_CARTOONIST &&
    sloppiness !== SLOPPINESS_DOUBLE
  ) {
    return null;
  }

  const inset = getSecondaryClosedShapeInset(element);
  const center = getElementCenter(element);
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
      points={points}
      {...getSecondaryStrokeProps(element, CARTOONIST_FILTER_VARIANT)}
    />
  );
}

function SecondaryEllipseStroke({ element }: { element: KizkattElement }) {
  const sloppiness = getSloppiness(element);

  if (
    sloppiness !== SLOPPINESS_CARTOONIST &&
    sloppiness !== SLOPPINESS_DOUBLE
  ) {
    return null;
  }

  const inset = getSecondaryClosedShapeInset(element);

  return (
    <ellipse
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
      {...getSecondaryStrokeProps(element, CARTOONIST_FILTER_VARIANT)}
    />
  );
}

function getLineOffsetPoints(element: KizkattElement) {
  const offset = getDoubleStrokeOffset(element);
  const length =
    Math.hypot(element.width, element.height) || MIN_RENDERED_STROKE_WIDTH;
  const normal = {
    x: (-element.height / length) * offset,
    y: (element.width / length) * offset
  };

  return {
    x1: element.x + normal.x,
    x2: element.x + element.width + normal.x,
    y1: element.y + normal.y,
    y2: element.y + element.height + normal.y
  };
}

function SecondaryLineStroke({
  element,
  linePoints
}: {
  element: KizkattElement;
  linePoints: Array<{ x: number; y: number }>;
}) {
  const sloppiness = getSloppiness(element);

  if (
    sloppiness !== SLOPPINESS_CARTOONIST &&
    sloppiness !== SLOPPINESS_DOUBLE
  ) {
    return null;
  }

  const secondaryProps = getSecondaryStrokeProps(
    element,
    CARTOONIST_FILTER_VARIANT
  );

  if (linePoints.length > LINEAR_ELEMENT_SIMPLE_POINT_COUNT) {
    const offset = getDoubleStrokeOffset(element);
    const d = getLinearElementPath(
      linePoints.map((point) => ({
        x: point.x,
        y: point.y + offset
      })),
      element.edgeStyle
    );

    return <path d={d} {...secondaryProps} />;
  }

  return <line {...getLineOffsetPoints(element)} {...secondaryProps} />;
}

function SecondaryFreehandStroke({ element }: { element: KizkattElement }) {
  const sloppiness = getSloppiness(element);

  if (
    sloppiness !== SLOPPINESS_CARTOONIST &&
    sloppiness !== SLOPPINESS_DOUBLE
  ) {
    return null;
  }

  const offset = getDoubleStrokeOffset(element);
  const d = (element.points ?? [])
    .map((point, index) => {
      const command =
        index === ZERO_COORDINATE ? SVG_MOVE_COMMAND : SVG_LINE_COMMAND;

      return `${command} ${element.x + point.x} ${element.y + point.y + offset}`;
    })
    .join(SVG_COMMAND_SEPARATOR);

  return (
    <path
      d={d}
      {...getSecondaryStrokeProps(element, CARTOONIST_FILTER_VARIANT)}
    />
  );
}

export function renderElementOverlay(
  element: KizkattElement,
  options: RenderElementOptions = {}
) {
  const isInternalOverlay = options.overlayVariant === "internal";

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
        {hasBends ? (
          <ElementOverlay
            element={element}
            showBounds={options.showSelectionBounds ?? true}
            showRotateHoverIcon={options.showRotateHoverIcon ?? true}
            showRotateHandle={options.showRotateHandle ?? true}
          />
        ) : null}
        <LinearElementOverlay
          element={element}
          bends={bends}
          linePoints={linePoints}
          selectedBendIndex={options.selectedBendIndex}
          showBounds={options.showSelectionBounds ?? true}
          showBendHandles={options.showLinearBendHandles ?? true}
          showRotateHoverIcon={options.showRotateHoverIcon ?? true}
          showRotateHandle={!hasBends && (options.showRotateHandle ?? true)}
        />
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

export function renderElement(
  element: KizkattElement,
  selected: boolean,
  options: RenderElementOptions = {}
) {
  const commonProps = getPrimaryShapeProps(element);
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
        <rect
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          rx={edgeRadius}
          fill={getElementFill(element)}
          {...commonProps}
        />
        <SecondaryRectStroke element={element} />
        {selected && <SelectedElementOverlay element={element} options={options} />}
      </ElementGroup>
    );
  }

  if (element.type === "image") {
    return (
      <ElementGroup key={element.id} element={element}>
        <ElementFillPattern element={element} />
        <ElementSloppyFilter element={element} />
        <ElementSloppyFilter
          element={element}
          variant={CARTOONIST_FILTER_VARIANT}
        />
        {element.svgContent ? (
          <InlineSvgObject element={element} />
        ) : element.src ? (
          <image
            href={element.src}
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            preserveAspectRatio="xMidYMid meet"
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
            {...commonProps}
          />
        )}
        {!element.src && <SecondaryRectStroke element={element} />}
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
        <polygon points={points} fill={getElementFill(element)} {...commonProps} />
        <SecondaryDiamondStroke element={element} />
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
        <ellipse
          cx={element.x + element.width / HALF_DIVISOR}
          cy={element.y + element.height / HALF_DIVISOR}
          rx={Math.abs(element.width / HALF_DIVISOR)}
          ry={Math.abs(element.height / HALF_DIVISOR)}
          fill={getElementFill(element)}
          {...commonProps}
        />
        <SecondaryEllipseStroke element={element} />
        {selected && <SelectedElementOverlay element={element} options={options} />}
      </ElementGroup>
    );
  }

  if (element.type === "line" || element.type === "arrow") {
    const bends = getElementBends(element);
    const linePoints = getLinearElementPoints(element, bends);
    const hasBends = bends.length > ZERO_COORDINATE;
    const canUseFill = canElementUseBackground(element);
    const pathData = getLinearElementPath(linePoints, element.edgeStyle);
    const markerEnd =
      element.type === "arrow" ? ARROW_MARKER_URL : undefined;

    return (
      <ElementGroup key={element.id} element={element}>
        {canUseFill && <ElementFillPattern element={element} />}
        <ElementSloppyFilter element={element} />
        <ElementSloppyFilter
          element={element}
          variant={CARTOONIST_FILTER_VARIANT}
        />
        {hasBends || canUseFill ? (
          <path
            d={`${pathData}${canUseFill ? SVG_PATH_CLOSE_COMMAND : ""}`}
            fill={canUseFill ? getElementFill(element) : SVG_FILL_NONE}
            markerEnd={markerEnd}
            {...commonProps}
          />
        ) : (
          <line
            x1={element.x}
            y1={element.y}
            x2={element.x + element.width}
            y2={element.y + element.height}
            fill={SVG_FILL_NONE}
            markerEnd={markerEnd}
            {...commonProps}
          />
        )}
        <SecondaryLineStroke element={element} linePoints={linePoints} />
        {selected && (
          <>
            {hasBends ? (
              <ElementOverlay
                element={element}
                showBounds={options.showSelectionBounds ?? true}
                showRotateHandle={options.showRotateHandle ?? true}
              />
            ) : null}
            <LinearElementOverlay
              element={element}
              bends={bends}
              linePoints={linePoints}
              selectedBendIndex={options.selectedBendIndex}
              showBounds={options.showSelectionBounds ?? true}
              showBendHandles={options.showLinearBendHandles ?? true}
              showRotateHandle={!hasBends && (options.showRotateHandle ?? true)}
            />
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
        <path
          d={`${freehandPath}${canUseFill ? SVG_PATH_CLOSE_COMMAND : ""}`}
          fill={canUseFill ? getElementFill(element) : SVG_FILL_NONE}
          {...commonProps}
        />
        <SecondaryFreehandStroke element={element} />
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
