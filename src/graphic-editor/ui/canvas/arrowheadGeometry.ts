import type { KizkattElement, Point } from "kizkatt-graphic-engine";
import {
  ARROW_MARKER_HEIGHT,
  ARROW_MARKER_REF_Y,
  ARROW_MARKER_WIDTH
} from "kizkatt-graphic-engine";

import { MIN_RENDERED_STROKE_WIDTH } from "./renderingConstants";

export type ArrowheadGeometry = {
  angle: number;
  base: Point;
  end: Point;
  length: number;
  scaleX: number;
  scaleY: number;
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

export function getArrowheadGeometry(
  element: KizkattElement,
  linePoints: Point[]
): ArrowheadGeometry | null {
  if (element.type !== "arrow" || element.strokeWidth <= 0) {
    return null;
  }

  const end = linePoints[linePoints.length - 1];

  if (!end) {
    return null;
  }

  let tangentStart: Point | undefined;

  for (let index = linePoints.length - 2; index >= 0; index -= 1) {
    const point = linePoints[index];

    if (Math.hypot(end.x - point.x, end.y - point.y) > Number.EPSILON) {
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
    element.strokeWidth
  );
  const markerCoordinateSize = ARROW_MARKER_REF_Y * 2;
  const logarithmicSizeFactor = 1 + Math.log(strokeWidth);
  const desiredLength = ARROW_MARKER_WIDTH * logarithmicSizeFactor;
  const lineLength = getLinePointsLength(linePoints);
  const length = Math.min(
    desiredLength,
    lineLength * 0.75,
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
    length,
    scaleX,
    scaleY
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
