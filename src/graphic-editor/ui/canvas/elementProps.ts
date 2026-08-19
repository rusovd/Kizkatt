import { PERCENT_MAX_VALUE } from "../../config/constants";
import { getElementCenter, transformSvgPathData } from "../../geometry";
import type { KizkattElement } from "../../model/types";
import {
  DASH_VALUE_DECIMALS,
  DASHED_STROKE_DASH_MULTIPLIER,
  DASHED_STROKE_GAP_MULTIPLIER,
  DASHED_STROKE_MIN_DASH,
  DASHED_STROKE_MIN_GAP,
  DASH_DOT_STROKE_GAP_MULTIPLIER,
  DASH_DOT_STROKE_MIN_GAP,
  DEFAULT_SELECTED_SLOPPINESS,
  DEFAULT_SLOPPINESS,
  DOTTED_STROKE_GAP_MULTIPLIER,
  DOTTED_STROKE_MIN_GAP,
  MIN_RENDERED_STROKE_WIDTH,
  SVG_DEGREES_PER_RADIAN,
  SVG_LINECAP_BUTT,
  SVG_LINECAP_ROUND,
  SVG_LINEJOIN_ROUND,
  STROKE_STYLE_DASHED,
  STROKE_STYLE_DASH_DOT,
  STROKE_STYLE_DOTTED,
  STROKE_STYLE_SOLID,
  STROKE_STYLE_STITCHED,
  STROKE_STYLE_WAVY,
  STROKE_STYLE_ZIGZAG,
  STITCHED_STROKE_DASH_MULTIPLIER,
  STITCHED_STROKE_GAP_MULTIPLIER,
  STITCHED_STROKE_MIN_DASH,
  STITCHED_STROKE_MIN_GAP,
  VECTOR_EFFECT_NON_SCALING_STROKE
} from "./renderingConstants";

function formatDashValue(value: number) {
  return Number.isInteger(value)
    ? `${value}`
    : value.toFixed(DASH_VALUE_DECIMALS);
}

export function getRenderedStrokeWidth(element: KizkattElement) {
  const stretch = element.calligraphy
    ? Math.max(0.5, Math.min(3, element.calligraphyStretch ?? 1))
    : 1;

  return element.strokeWidth * stretch;
}

function hasRoundedStrokeEdges(element: KizkattElement) {
  return (element.edgeStyle ?? SVG_LINECAP_ROUND) === SVG_LINECAP_ROUND;
}

export function usesGeometricDotPattern(element: KizkattElement) {
  return (
    element.strokeStyle === STROKE_STYLE_DOTTED ||
    element.strokeStyle === STROKE_STYLE_DASH_DOT
  );
}

function getStrokeDasharray(element: KizkattElement) {
  if (
    element.strokeStyle === STROKE_STYLE_SOLID ||
    element.strokeStyle === STROKE_STYLE_WAVY ||
    element.strokeStyle === STROKE_STYLE_ZIGZAG
  ) {
    return undefined;
  }

  const strokeWidth = Math.max(MIN_RENDERED_STROKE_WIDTH, element.strokeWidth);

  if (element.strokeStyle === STROKE_STYLE_DASHED) {
    const dash = Math.max(
      DASHED_STROKE_MIN_DASH,
      strokeWidth * DASHED_STROKE_DASH_MULTIPLIER
    );
    const gap = Math.max(
      DASHED_STROKE_MIN_GAP,
      strokeWidth * DASHED_STROKE_GAP_MULTIPLIER
    );

    return `${formatDashValue(dash)} ${formatDashValue(gap)}`;
  }

  if (element.strokeStyle === STROKE_STYLE_STITCHED) {
    const stitch = Math.max(
      STITCHED_STROKE_MIN_DASH,
      strokeWidth * STITCHED_STROKE_DASH_MULTIPLIER
    );
    const gap = Math.max(
      STITCHED_STROKE_MIN_GAP,
      strokeWidth * STITCHED_STROKE_GAP_MULTIPLIER
    );

    return `${formatDashValue(stitch)} ${formatDashValue(gap)}`;
  }

  if (element.strokeStyle === STROKE_STYLE_DASH_DOT) {
    const rounded = hasRoundedStrokeEdges(element);
    const dash = Math.max(
      DASHED_STROKE_MIN_DASH,
      strokeWidth * DASHED_STROKE_DASH_MULTIPLIER
    );
    const visibleGap = Math.max(
      DASH_DOT_STROKE_MIN_GAP,
      strokeWidth * DASH_DOT_STROKE_GAP_MULTIPLIER
    );
    const patternDash = rounded ? Math.max(0, dash - strokeWidth) : dash;
    const patternDot = rounded ? 0 : strokeWidth;
    const patternGap = visibleGap + (rounded ? strokeWidth : 0);

    return [patternDash, patternGap, patternDot, patternGap]
      .map(formatDashValue)
      .join(" ");
  }

  if (element.strokeStyle !== STROKE_STYLE_DOTTED) {
    return undefined;
  }

  const visibleGap = Math.max(
    DOTTED_STROKE_MIN_GAP,
    strokeWidth * DOTTED_STROKE_GAP_MULTIPLIER
  );
  const rounded = hasRoundedStrokeEdges(element);
  const patternDot = rounded ? 0 : strokeWidth;
  const patternGap = visibleGap + (rounded ? strokeWidth : 0);

  return `${formatDashValue(patternDot)} ${formatDashValue(patternGap)}`;
}

export function getElementTransform(element: KizkattElement) {
  const center = getElementCenter(element);
  const rotate = element.angle * SVG_DEGREES_PER_RADIAN;
  const skewX = (element.skewX ?? 0) * SVG_DEGREES_PER_RADIAN;
  const skewY = (element.skewY ?? 0) * SVG_DEGREES_PER_RADIAN;
  const flip =
    element.flipX || element.flipY
      ? `scale(${element.flipX ? -1 : 1} ${element.flipY ? -1 : 1})`
      : null;

  return [
    `translate(${center.x} ${center.y})`,
    `rotate(${rotate})`,
    `skewX(${skewX})`,
    `skewY(${skewY})`,
    flip,
    `translate(${-center.x} ${-center.y})`
  ]
    .filter((transform): transform is string => transform !== null)
    .join(" ");
}

export function getElementShapeProps(element: KizkattElement) {
  const calligraphy = element.calligraphy === true;
  const strokeLinejoin: "miter" | "round" =
    element.edgeStyle === "sharp" || calligraphy
      ? "miter"
      : SVG_LINEJOIN_ROUND;
  const strokeLinecap: "butt" | "round" =
    calligraphy
      ? SVG_LINECAP_BUTT
      : usesGeometricDotPattern(element)
      ? hasRoundedStrokeEdges(element)
        ? SVG_LINECAP_ROUND
        : SVG_LINECAP_BUTT
      : (element.sloppiness ?? DEFAULT_SELECTED_SLOPPINESS) === DEFAULT_SLOPPINESS
        ? SVG_LINECAP_BUTT
        : SVG_LINECAP_ROUND;

  return {
    stroke: element.strokeColor,
    strokeWidth: getRenderedStrokeWidth(element),
    strokeDasharray: getStrokeDasharray(element),
    opacity: element.opacity / PERCENT_MAX_VALUE,
    paintOrder: element.strokeBehindFill ? "stroke fill markers" : undefined,
    strokeLinecap,
    strokeLinejoin,
    vectorEffect: VECTOR_EFFECT_NON_SCALING_STROKE
  };
}

export function getFreehandPath(element: KizkattElement) {
  if (element.pathData) {
    return (
      transformSvgPathData(element.pathData, {
        transformPoint: (point) => ({
          x: element.x + point.x,
          y: element.y + point.y
        })
      })?.pathData ?? ""
    );
  }

  return (element.points ?? [])
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";

      return `${command} ${element.x + point.x} ${element.y + point.y}`;
    })
    .join(" ");
}
