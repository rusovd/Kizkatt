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
import type {
  KizkattElement,
  LinearEndpoint,
  Point
} from "../model/types";
import {
  distanceSquaredToSegment,
  getElementEnd,
  getElementLocalPoint,
  getElementLocalVector,
  getSegmentMidpoint,
  transformElementPoint
} from "./primitives";

const MIN_LINEAR_SCALE_DENOMINATOR = 0.000001;

export function insertLinearElementBend(
  element: KizkattElement,
  worldPoint: Point
) {
  const localPoint = getElementLocalPoint(element, worldPoint);
  const linePoints = getLinearElementPoints(element);
  let nearestSegmentIndex = FIRST_ARRAY_INDEX;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (
    let index = FIRST_ARRAY_INDEX;
    index < linePoints.length - NEXT_ARRAY_INDEX_OFFSET;
    index += NEXT_ARRAY_INDEX_OFFSET
  ) {
    const distance = distanceSquaredToSegment(
      localPoint,
      linePoints[index],
      linePoints[index + NEXT_ARRAY_INDEX_OFFSET]
    );

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestSegmentIndex = index;
    }
  }

  const bends = getElementBends(element);
  const segmentStart = linePoints[nearestSegmentIndex];
  const segmentEnd = linePoints[nearestSegmentIndex + NEXT_ARRAY_INDEX_OFFSET];
  const segmentX = segmentEnd.x - segmentStart.x;
  const segmentY = segmentEnd.y - segmentStart.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
  const segmentPosition =
    segmentLengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((localPoint.x - segmentStart.x) * segmentX +
              (localPoint.y - segmentStart.y) * segmentY) /
              segmentLengthSquared
          )
        );
  const projectedPoint = {
    x: segmentStart.x + segmentPosition * segmentX,
    y: segmentStart.y + segmentPosition * segmentY
  };
  const nextBend = {
    x: projectedPoint.x - element.x,
    y: projectedPoint.y - element.y
  };

  return {
    bendIndex: nearestSegmentIndex,
    element: {
      ...element,
      bends: [
        ...bends.slice(FIRST_ARRAY_INDEX, nearestSegmentIndex),
        nextBend,
        ...bends.slice(nearestSegmentIndex)
      ],
      curve: undefined
    }
  };
}

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

function scaleLinearCoordinate(
  value: number,
  originalSize: number,
  nextSize: number
) {
  return Math.abs(originalSize) <= MIN_LINEAR_SCALE_DENOMINATOR
    ? value
    : (value / originalSize) * nextSize;
}

function preserveLinearPointInWorld(
  originalElement: KizkattElement,
  nextElement: KizkattElement,
  point: Point
) {
  const worldPoint = transformElementPoint(originalElement, {
    x: originalElement.x + point.x,
    y: originalElement.y + point.y
  });
  const nextLocalPoint = getElementLocalPoint(nextElement, worldPoint);

  return {
    x: nextLocalPoint.x - nextElement.x,
    y: nextLocalPoint.y - nextElement.y
  };
}

export function moveLinearElementEndpoint(
  element: KizkattElement,
  endpoint: LinearEndpoint,
  point: Point,
  mode: "node" | "resize"
) {
  const originalStart = transformElementPoint(element, {
    x: element.x,
    y: element.y
  });
  const originalEnd = transformElementPoint(element, getElementEnd(element));
  const nextStart = endpoint === "start" ? point : originalStart;
  const nextEnd = endpoint === "end" ? point : originalEnd;
  const nextCenter = {
    x: (nextStart.x + nextEnd.x) / HALF_DIVISOR,
    y: (nextStart.y + nextEnd.y) / HALF_DIVISOR
  };
  const nextSize = getElementLocalVector(element, {
    x: nextEnd.x - nextStart.x,
    y: nextEnd.y - nextStart.y
  });
  const nextElement = {
    ...element,
    height: nextSize.y,
    width: nextSize.x,
    x: nextCenter.x - nextSize.x / HALF_DIVISOR,
    y: nextCenter.y - nextSize.y / HALF_DIVISOR
  };
  const originalBends = getElementBends(element);

  if (originalBends.length === EMPTY_COLLECTION_LENGTH) {
    return nextElement;
  }

  return {
    ...nextElement,
    bends:
      mode === "node"
        ? originalBends.map((bend) =>
            preserveLinearPointInWorld(element, nextElement, bend)
          )
        : originalBends.map((bend) => ({
            x: scaleLinearCoordinate(bend.x, element.width, nextSize.x),
            y: scaleLinearCoordinate(bend.y, element.height, nextSize.y)
          })),
    curve: undefined
  };
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
