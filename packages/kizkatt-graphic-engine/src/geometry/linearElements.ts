import {
  CUBIC_BEZIER_WEIGHT,
  CUBIC_CONTROL_POINT_DIVISOR,
  DEFAULT_EDGE_STYLE,
  EMPTY_COLLECTION_LENGTH,
  HALF_DIVISOR,
  EMPTY_PATH_DATA,
  FIRST_ARRAY_INDEX,
  LINEAR_PATH_MIN_POINT_COUNT,
  LINEAR_PATH_STRAIGHT_POINT_COUNT,
  NEXT_ARRAY_INDEX_OFFSET,
  SHARP_EDGE_STYLE,
  SVG_COMMAND_SEPARATOR,
  SVG_CUBIC_COMMAND,
  SVG_LINE_COMMAND,
  SVG_MOVE_COMMAND
} from "../config/constants";
import type { KizkattElement, Point } from "../model/types";
import { getElementEnd, getSegmentMidpoint } from "./primitives";

export function getElementBends(element: KizkattElement) {
  return element.bends ?? (element.curve ? [element.curve] : []);
}

export function getLinearElementPoints(
  element: KizkattElement,
  bends = getElementBends(element)
) {
  return [
    { x: element.x, y: element.y },
    ...bends.map((point) => ({
      x: element.x + point.x,
      y: element.y + point.y
    })),
    getElementEnd(element)
  ];
}

export function getLinearElementPath(
  points: Point[],
  edgeStyle: KizkattElement["edgeStyle"] = DEFAULT_EDGE_STYLE
) {
  if (points.length === EMPTY_COLLECTION_LENGTH) {
    return EMPTY_PATH_DATA;
  }

  if (points.length === LINEAR_PATH_MIN_POINT_COUNT) {
    return `${SVG_MOVE_COMMAND} ${points[FIRST_ARRAY_INDEX].x} ${
      points[FIRST_ARRAY_INDEX].y
    }`;
  }

  if (points.length === LINEAR_PATH_STRAIGHT_POINT_COUNT) {
    return `${SVG_MOVE_COMMAND} ${points[FIRST_ARRAY_INDEX].x} ${
      points[FIRST_ARRAY_INDEX].y
    } ${SVG_LINE_COMMAND} ${points[NEXT_ARRAY_INDEX_OFFSET].x} ${
      points[NEXT_ARRAY_INDEX_OFFSET].y
    }`;
  }

  if (edgeStyle === SHARP_EDGE_STYLE) {
    return points
      .map((point, index) => {
        const command =
          index === FIRST_ARRAY_INDEX ? SVG_MOVE_COMMAND : SVG_LINE_COMMAND;

        return `${command} ${point.x} ${point.y}`;
      })
      .join(SVG_COMMAND_SEPARATOR);
  }

  const commands = [
    `${SVG_MOVE_COMMAND} ${points[FIRST_ARRAY_INDEX].x} ${
      points[FIRST_ARRAY_INDEX].y
    }`
  ];

  for (
    let index = FIRST_ARRAY_INDEX;
    index < points.length - NEXT_ARRAY_INDEX_OFFSET;
    index += NEXT_ARRAY_INDEX_OFFSET
  ) {
    const current = points[index];
    const next = points[index + NEXT_ARRAY_INDEX_OFFSET];
    const { cp1, cp2 } = getLinearElementCubicControlPoints(points, index);

    commands.push(
      `${SVG_CUBIC_COMMAND} ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${next.x} ${next.y}`
    );
  }

  return commands.join(SVG_COMMAND_SEPARATOR);
}

function getLinearElementCubicControlPoints(points: Point[], index: number) {
  const previous =
    points[Math.max(FIRST_ARRAY_INDEX, index - NEXT_ARRAY_INDEX_OFFSET)];
  const current = points[index];
  const next = points[index + NEXT_ARRAY_INDEX_OFFSET];
  const nextNext =
    points[
      Math.min(
        points.length - NEXT_ARRAY_INDEX_OFFSET,
        index + LINEAR_PATH_STRAIGHT_POINT_COUNT
      )
    ];

  return {
    cp1: {
      x: current.x + (next.x - previous.x) / CUBIC_CONTROL_POINT_DIVISOR,
      y: current.y + (next.y - previous.y) / CUBIC_CONTROL_POINT_DIVISOR
    },
    cp2: {
      x: next.x - (nextNext.x - current.x) / CUBIC_CONTROL_POINT_DIVISOR,
      y: next.y - (nextNext.y - current.y) / CUBIC_CONTROL_POINT_DIVISOR
    }
  };
}

function getCubicBezierMidpoint(
  start: Point,
  cp1: Point,
  cp2: Point,
  end: Point
) {
  const t = 1 / HALF_DIVISOR;
  const inverseT = 1 - t;
  const inverseSquared = inverseT * inverseT;
  const tSquared = t * t;

  return {
    x:
      inverseSquared * inverseT * start.x +
      CUBIC_BEZIER_WEIGHT * inverseSquared * t * cp1.x +
      CUBIC_BEZIER_WEIGHT * inverseT * tSquared * cp2.x +
      tSquared * t * end.x,
    y:
      inverseSquared * inverseT * start.y +
      CUBIC_BEZIER_WEIGHT * inverseSquared * t * cp1.y +
      CUBIC_BEZIER_WEIGHT * inverseT * tSquared * cp2.y +
      tSquared * t * end.y
  };
}

export function getLinearElementSegmentMidpoint(
  points: Point[],
  index: number,
  edgeStyle: KizkattElement["edgeStyle"] = DEFAULT_EDGE_STYLE
) {
  const start = points[index];
  const end = points[index + NEXT_ARRAY_INDEX_OFFSET];

  if (
    edgeStyle === SHARP_EDGE_STYLE ||
    points.length <= LINEAR_PATH_STRAIGHT_POINT_COUNT
  ) {
    return getSegmentMidpoint(start, end);
  }

  const { cp1, cp2 } = getLinearElementCubicControlPoints(points, index);

  return getCubicBezierMidpoint(start, cp1, cp2, end);
}
