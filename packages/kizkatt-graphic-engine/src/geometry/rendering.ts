import {
  DEFAULT_SELECTED_SLOPPINESS,
  DEFAULT_SLOPPINESS,
  MIN_RENDERED_STROKE_WIDTH,
  PERCENT_MAX_VALUE
} from "../config/constants";
import type { KizkattElement } from "../model/types";
import { getElementCenter } from "./primitives";
import { transformSvgPathData } from "./svgPathData";

const SVG_DEGREES_PER_RADIAN = 180 / Math.PI;
const SVG_LINECAP_BUTT = "butt" as const;
const SVG_LINECAP_ROUND = "round" as const;
const SVG_LINEJOIN_ROUND = "round" as const;
const VECTOR_EFFECT_NON_SCALING_STROKE = "non-scaling-stroke" as const;
const STROKE_STYLE_SOLID = "solid";
const STROKE_STYLE_DASHED = "dashed";
const STROKE_STYLE_DASH_DOT = "dashDot";
const STROKE_STYLE_DOTTED = "dotted";
const STROKE_STYLE_STITCHED = "stitched";
const STROKE_STYLE_WAVY = "wavy";
const STROKE_STYLE_ZIGZAG = "zigzag";
const DASHED_STROKE_MIN_DASH = 10;
const DASHED_STROKE_DASH_MULTIPLIER = 1.45;
const DASHED_STROKE_MIN_GAP = 8;
const DASHED_STROKE_GAP_MULTIPLIER = 1.6;
const DASH_DOT_STROKE_MIN_GAP = 6;
const DASH_DOT_STROKE_GAP_MULTIPLIER = 0.8;
const DOTTED_STROKE_MIN_GAP = 6;
const DOTTED_STROKE_GAP_MULTIPLIER = 0.5;
const STITCHED_STROKE_MIN_DASH = 2;
const STITCHED_STROKE_DASH_MULTIPLIER = 0.12;
const STITCHED_STROKE_MIN_GAP = 8;
const STITCHED_STROKE_GAP_MULTIPLIER = 1.8;
const DASH_VALUE_DECIMALS = 2;

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
  const strokeLinecap: "butt" | "round" = calligraphy
    ? SVG_LINECAP_BUTT
    : usesGeometricDotPattern(element)
      ? hasRoundedStrokeEdges(element)
        ? SVG_LINECAP_ROUND
        : SVG_LINECAP_BUTT
      : (element.sloppiness ?? DEFAULT_SELECTED_SLOPPINESS) ===
          DEFAULT_SLOPPINESS
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
