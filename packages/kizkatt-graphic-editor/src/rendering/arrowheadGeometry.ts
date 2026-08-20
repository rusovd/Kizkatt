import type {
  ArrowheadStyle,
  KizkattElement,
  LinearEndpoint,
  Point
} from "kizkatt-graphic-engine";
import {
  ARROW_MARKER_HEIGHT,
  ARROW_MARKER_REF_Y,
  ARROW_MARKER_WIDTH
} from "kizkatt-graphic-engine";

import { MIN_RENDERED_STROKE_WIDTH } from "./constants";

export type ArrowheadGeometry = {
  angle: number;
  base: Point;
  end: Point;
  endpoint: LinearEndpoint;
  length: number;
  scaleX: number;
  scaleY: number;
  style: Exclude<ArrowheadStyle, "none">;
};

function getLinePointsLength(linePoints: Point[]) {
  return linePoints.slice(1).reduce((length, point, index) => {
    const previous = linePoints[index];

    return length + Math.hypot(
      point.x - previous.x,
      point.y - previous.y
    );
  }, 0);
}

export function getElementArrowheadStyle(
  element: KizkattElement,
  endpoint: LinearEndpoint
): ArrowheadStyle {
  const configuredStyle = endpoint === "start"
    ? element.startArrowhead
    : element.endArrowhead;

  if (configuredStyle) {
    return configuredStyle;
  }

  return endpoint === "end" && element.type === "arrow"
    ? "triangle"
    : "none";
}

export function getArrowheadGeometry(
  element: KizkattElement,
  linePoints: Point[],
  endpoint: LinearEndpoint = "end"
): ArrowheadGeometry | null {
  const style = getElementArrowheadStyle(element, endpoint);

  if (style === "none" || element.strokeWidth <= 0) {
    return null;
  }

  const isStart = endpoint === "start";
  const end = isStart ? linePoints[0] : linePoints[linePoints.length - 1];

  if (!end) {
    return null;
  }

  let tangentStart: Point | undefined;
  const firstIndex = isStart ? 1 : linePoints.length - 2;
  const lastIndex = isStart ? linePoints.length : -1;
  const step = isStart ? 1 : -1;

  for (let index = firstIndex; index !== lastIndex; index += step) {
    const point = linePoints[index];

    if (point && Math.hypot(end.x - point.x, end.y - point.y) > Number.EPSILON) {
      tangentStart = point;
      break;
    }
  }

  if (!tangentStart) {
    return null;
  }

  const deltaX = end.x - tangentStart.x;
  const deltaY = end.y - tangentStart.y;
  const tangentLength = Math.hypot(deltaX, deltaY);
  const strokeWidth = Math.max(
    MIN_RENDERED_STROKE_WIDTH,
    element.strokeWidth *
      (element.calligraphy
        ? Math.max(0.5, Math.min(3, element.calligraphyStretch ?? 1))
        : 1)
  );
  const markerCoordinateSize = ARROW_MARKER_REF_Y * 2;
  const logarithmicSizeFactor = 1 + Math.log(strokeWidth);
  const arrowheadScale = Math.max(
    0.25,
    Math.min(4, element.arrowheadScale ?? 1)
  );
  const desiredLength =
    ARROW_MARKER_WIDTH * logarithmicSizeFactor * arrowheadScale;
  const lineLength = getLinePointsLength(linePoints);
  const length = Math.min(
    desiredLength,
    lineLength * 0.375,
    tangentLength
  );
  const scaleX = length / markerCoordinateSize;
  const scaleY =
    (ARROW_MARKER_HEIGHT / ARROW_MARKER_WIDTH) * scaleX;
  const unitX = deltaX / tangentLength;
  const unitY = deltaY / tangentLength;

  return {
    angle: Math.atan2(deltaY, deltaX) * (180 / Math.PI),
    base: {
      x: end.x - unitX * length,
      y: end.y - unitY * length
    },
    end,
    endpoint,
    length,
    scaleX,
    scaleY,
    style
  };
}

export function shortenLinePoints(linePoints: Point[], length: number) {
  let remaining = length;

  for (let index = linePoints.length - 1; index > 0; index -= 1) {
    const start = linePoints[index - 1];
    const end = linePoints[index];
    const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);

    if (segmentLength <= Number.EPSILON) {
      continue;
    }

    if (remaining < segmentLength) {
      const retainedRatio = (segmentLength - remaining) / segmentLength;

      return [
        ...linePoints.slice(0, index),
        {
          x: start.x + (end.x - start.x) * retainedRatio,
          y: start.y + (end.y - start.y) * retainedRatio
        }
      ];
    }

    remaining -= segmentLength;
  }

  return linePoints.slice(0, 1);
}

function shortenLinePointsAtStart(linePoints: Point[], length: number) {
  return shortenLinePoints([...linePoints].reverse(), length).reverse();
}

export function shortenLinePointsForArrowheads(
  linePoints: Point[],
  startGeometry: ArrowheadGeometry | null,
  endGeometry: ArrowheadGeometry | null
) {
  const shortenedAtEnd = endGeometry
    ? shortenLinePoints(linePoints, endGeometry.length)
    : linePoints;

  return startGeometry
    ? shortenLinePointsAtStart(shortenedAtEnd, startGeometry.length)
    : shortenedAtEnd;
}
