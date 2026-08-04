import { PERCENT_MAX_VALUE } from "../../config/constants";
import { getElementCenter } from "../../geometry";
import type { KizkattElement } from "../../model/types";
import {
  DASH_VALUE_DECIMALS,
  DASHED_STROKE_DASH_MULTIPLIER,
  DASHED_STROKE_GAP_MULTIPLIER,
  DASHED_STROKE_MIN_DASH,
  DASHED_STROKE_MIN_GAP,
  DEFAULT_SELECTED_SLOPPINESS,
  DEFAULT_SLOPPINESS,
  DOTTED_STROKE_DOT_MULTIPLIER,
  DOTTED_STROKE_GAP_MULTIPLIER,
  DOTTED_STROKE_MIN_DOT,
  DOTTED_STROKE_MIN_GAP,
  MIN_RENDERED_STROKE_WIDTH,
  SVG_DEGREES_PER_RADIAN,
  SVG_LINECAP_BUTT,
  SVG_LINECAP_ROUND,
  SVG_LINEJOIN_ROUND,
  STROKE_STYLE_DASHED,
  STROKE_STYLE_SOLID,
  VECTOR_EFFECT_NON_SCALING_STROKE
} from "./renderingConstants";

function formatDashValue(value: number) {
  return Number.isInteger(value)
    ? `${value}`
    : value.toFixed(DASH_VALUE_DECIMALS);
}

function getStrokeDasharray(element: KizkattElement) {
  if (element.strokeStyle === STROKE_STYLE_SOLID) {
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

  const dot = Math.max(
    DOTTED_STROKE_MIN_DOT,
    strokeWidth * DOTTED_STROKE_DOT_MULTIPLIER
  );
  const gap = Math.max(
    DOTTED_STROKE_MIN_GAP,
    strokeWidth * DOTTED_STROKE_GAP_MULTIPLIER
  );

  return `${formatDashValue(dot)} ${formatDashValue(gap)}`;
}

export function getElementTransform(element: KizkattElement) {
  const center = getElementCenter(element);

  return `rotate(${
    element.angle * SVG_DEGREES_PER_RADIAN
  } ${center.x} ${center.y})`;
}

export function getElementShapeProps(element: KizkattElement) {
  const strokeLinecap: "butt" | "round" =
    (element.sloppiness ?? DEFAULT_SELECTED_SLOPPINESS) === DEFAULT_SLOPPINESS
      ? SVG_LINECAP_BUTT
      : SVG_LINECAP_ROUND;

  return {
    stroke: element.strokeColor,
    strokeWidth: element.strokeWidth,
    strokeDasharray: getStrokeDasharray(element),
    opacity: element.opacity / PERCENT_MAX_VALUE,
    strokeLinecap,
    strokeLinejoin: SVG_LINEJOIN_ROUND,
    vectorEffect: VECTOR_EFFECT_NON_SCALING_STROKE
  };
}

export function getFreehandPath(element: KizkattElement) {
  return (element.points ?? [])
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";

      return `${command} ${element.x + point.x} ${element.y + point.y}`;
    })
    .join(" ");
}
