import { transformSvgPathData } from "../../geometry";
import type { KizkattElement, Point } from "../../model/types";

export type DecorativeStrokeStyle = "wavy" | "zigzag";

type StrokeOutline = {
  closed: boolean;
  points: Point[];
};

type StrokeSegment = {
  end: Point;
  length: number;
  start: Point;
};

const MIN_AMPLITUDE = 2.5;
const MAX_AMPLITUDE = 10;
const AMPLITUDE_STROKE_MULTIPLIER = 1.8;
const MIN_WAVELENGTH = 14;
const WAVELENGTH_AMPLITUDE_MULTIPLIER = 4;
const WAVY_SAMPLES_PER_CYCLE = 8;
const ZIGZAG_SAMPLES_PER_CYCLE = 4;
const ROUNDED_CORNER_SAMPLES = 5;
const MIN_ELLIPSE_SAMPLES = 32;
const MAX_ELLIPSE_SAMPLES = 128;
const ELLIPSE_SAMPLE_SPACING = 8;
const PATH_VALUE_PRECISION = 2;

function formatPathValue(value: number) {
  return `${Number(value.toFixed(PATH_VALUE_PRECISION))}`;
}

function appendArc(
  points: Point[],
  center: Point,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  for (let index = 1; index <= ROUNDED_CORNER_SAMPLES; index += 1) {
    const angle =
      startAngle +
      ((endAngle - startAngle) * index) / ROUNDED_CORNER_SAMPLES;

    points.push({
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius
    });
  }
}

function getRectangleOutline(element: KizkattElement): StrokeOutline {
  const width = Math.abs(element.width);
  const height = Math.abs(element.height);
  const x = Math.min(element.x, element.x + element.width);
  const y = Math.min(element.y, element.y + element.height);
  const radius =
    element.edgeStyle === "sharp"
      ? 0
      : Math.min(12, width / 2, height / 2);

  if (radius === 0) {
    return {
      closed: true,
      points: [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height }
      ]
    };
  }

  const points: Point[] = [
    { x: x + radius, y },
    { x: x + width - radius, y }
  ];
  appendArc(
    points,
    { x: x + width - radius, y: y + radius },
    radius,
    -Math.PI / 2,
    0
  );
  points.push({ x: x + width, y: y + height - radius });
  appendArc(
    points,
    { x: x + width - radius, y: y + height - radius },
    radius,
    0,
    Math.PI / 2
  );
  points.push({ x: x + radius, y: y + height });
  appendArc(
    points,
    { x: x + radius, y: y + height - radius },
    radius,
    Math.PI / 2,
    Math.PI
  );
  points.push({ x, y: y + radius });
  appendArc(
    points,
    { x: x + radius, y: y + radius },
    radius,
    Math.PI,
    (Math.PI * 3) / 2
  );
  points.pop();

  return { closed: true, points };
}

function getEllipseOutline(element: KizkattElement): StrokeOutline {
  const radiusX = Math.abs(element.width) / 2;
  const radiusY = Math.abs(element.height) / 2;
  const center = {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2
  };
  const approximateCircumference =
    Math.PI *
    (3 * (radiusX + radiusY) -
      Math.sqrt((3 * radiusX + radiusY) * (radiusX + 3 * radiusY)));
  const sampleCount = Math.max(
    MIN_ELLIPSE_SAMPLES,
    Math.min(
      MAX_ELLIPSE_SAMPLES,
      Math.ceil(approximateCircumference / ELLIPSE_SAMPLE_SPACING)
    )
  );
  const points = Array.from({ length: sampleCount }, (_, index) => {
    const angle = (index / sampleCount) * Math.PI * 2;

    return {
      x: center.x + Math.cos(angle) * radiusX,
      y: center.y + Math.sin(angle) * radiusY
    };
  });

  return { closed: true, points };
}

function getDiamondOutline(element: KizkattElement): StrokeOutline {
  const center = {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2
  };

  return {
    closed: true,
    points: [
      { x: center.x, y: element.y },
      { x: element.x + element.width, y: center.y },
      { x: center.x, y: element.y + element.height },
      { x: element.x, y: center.y }
    ]
  };
}

function getFreehandOutline(element: KizkattElement): StrokeOutline | null {
  if (element.pathData) {
    const transformedPath = transformSvgPathData(element.pathData, {
      transformPoint: (point) => ({
        x: element.x + point.x,
        y: element.y + point.y
      })
    });

    return transformedPath
      ? { closed: transformedPath.closed, points: transformedPath.points }
      : null;
  }

  const points = (element.points ?? []).map((point) => ({
    x: element.x + point.x,
    y: element.y + point.y
  }));

  return points.length > 1
    ? { closed: Boolean(element.closed), points }
    : null;
}

export function isDecorativeStrokeStyle(
  value: KizkattElement["strokeStyle"]
): value is DecorativeStrokeStyle {
  return value === "wavy" || value === "zigzag";
}

export function getDecorativeStrokeOutline(
  element: KizkattElement,
  linePoints?: Point[]
): StrokeOutline | null {
  if (element.type === "rectangle" || element.type === "image") {
    return getRectangleOutline(element);
  }

  if (element.type === "diamond") {
    return getDiamondOutline(element);
  }

  if (element.type === "ellipse") {
    return getEllipseOutline(element);
  }

  if (element.type === "line" || element.type === "arrow") {
    return linePoints && linePoints.length > 1
      ? { closed: Boolean(element.closed), points: linePoints }
      : null;
  }

  if (element.type === "draw") {
    return getFreehandOutline(element);
  }

  return null;
}

function getStrokeSegments(outline: StrokeOutline) {
  const points = outline.closed
    ? [...outline.points, outline.points[0]]
    : outline.points;
  const segments: StrokeSegment[] = [];
  let totalLength = 0;

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const length = Math.hypot(end.x - start.x, end.y - start.y);

    if (length > Number.EPSILON) {
      segments.push({ end, length, start });
      totalLength += length;
    }
  }

  return { segments, totalLength };
}

function getPointAtDistance(segments: StrokeSegment[], distance: number) {
  let remainingDistance = distance;

  for (const segment of segments) {
    if (remainingDistance <= segment.length) {
      const ratio = remainingDistance / segment.length;
      const direction = {
        x: (segment.end.x - segment.start.x) / segment.length,
        y: (segment.end.y - segment.start.y) / segment.length
      };

      return {
        direction,
        point: {
          x: segment.start.x + (segment.end.x - segment.start.x) * ratio,
          y: segment.start.y + (segment.end.y - segment.start.y) * ratio
        }
      };
    }

    remainingDistance -= segment.length;
  }

  const lastSegment = segments[segments.length - 1];

  return {
    direction: {
      x: (lastSegment.end.x - lastSegment.start.x) / lastSegment.length,
      y: (lastSegment.end.y - lastSegment.start.y) / lastSegment.length
    },
    point: lastSegment.end
  };
}

export function getDecorativeStrokePath(
  outline: StrokeOutline,
  style: DecorativeStrokeStyle,
  strokeWidth: number
) {
  const { segments, totalLength } = getStrokeSegments(outline);

  if (segments.length === 0 || totalLength <= Number.EPSILON) {
    return "";
  }

  const amplitude = Math.max(
    MIN_AMPLITUDE,
    Math.min(
      MAX_AMPLITUDE,
      Math.sqrt(Math.max(1, strokeWidth)) * AMPLITUDE_STROKE_MULTIPLIER
    )
  );
  const preferredWavelength = Math.max(
    MIN_WAVELENGTH,
    amplitude * WAVELENGTH_AMPLITUDE_MULTIPLIER
  );
  const cycleCount = Math.max(1, Math.round(totalLength / preferredWavelength));
  const samplesPerCycle =
    style === "wavy" ? WAVY_SAMPLES_PER_CYCLE : ZIGZAG_SAMPLES_PER_CYCLE;
  const sampleCount = cycleCount * samplesPerCycle;
  const sampledPoints = Array.from({ length: sampleCount + 1 }, (_, index) => {
    const distance = (totalLength * index) / sampleCount;
    const { direction, point } = getPointAtDistance(segments, distance);
    const phase = (index / samplesPerCycle) * Math.PI * 2;
    const patternValue =
      style === "wavy"
        ? Math.sin(phase)
        : (Math.asin(Math.sin(phase)) * 2) / Math.PI;
    const offset = patternValue * amplitude;

    return {
      x: point.x - direction.y * offset,
      y: point.y + direction.x * offset
    };
  });
  const [firstPoint, ...remainingPoints] = sampledPoints;
  const commands = [
    `M ${formatPathValue(firstPoint.x)} ${formatPathValue(firstPoint.y)}`,
    ...remainingPoints.map(
      (point) =>
        `L ${formatPathValue(point.x)} ${formatPathValue(point.y)}`
    )
  ];

  if (outline.closed) {
    commands.push("Z");
  }

  return commands.join(" ");
}
