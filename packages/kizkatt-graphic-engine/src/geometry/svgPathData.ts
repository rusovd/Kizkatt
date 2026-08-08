import type { Point } from "../model/types";

type SvgPathCommand = "M" | "L" | "C" | "S" | "Q" | "T" | "A" | "Z";

type RawSvgPathSegment = {
  command: string;
  values: number[];
};

type SvgPathDataTransformOptions = {
  transformArcRadii?: (radii: { rx: number; ry: number }) => {
    rx: number;
    ry: number;
  };
  transformPoint?: (point: Point) => Point;
};

export type TransformedSvgPathData = {
  closed: boolean;
  pathData: string;
  points: Point[];
};

const SVG_PATH_TOKEN_PATTERN =
  /[AaCcHhLlMmQqSsTtVvZz]|[-+]?(?:(?:\d*\.\d+)|(?:\d+\.?))(?:[eE][-+]?\d+)?/g;
const SVG_PATH_PARAMS_BY_COMMAND: Record<SvgPathCommand, number> = {
  A: 7,
  C: 6,
  L: 2,
  M: 2,
  Q: 4,
  S: 4,
  T: 2,
  Z: 0
};
const SVG_PATH_SUPPORTED_COMMANDS = new Set([
  "A",
  "C",
  "H",
  "L",
  "M",
  "Q",
  "S",
  "T",
  "V",
  "Z"
]);
const SVG_PATH_VALUE_PRECISION = 3;

function isPathCommandToken(token: string) {
  return /^[A-Za-z]$/.test(token);
}

function getPathCommandParamCount(command: string) {
  const normalizedCommand = command.toUpperCase();

  if (normalizedCommand === "H" || normalizedCommand === "V") {
    return 1;
  }

  return SVG_PATH_PARAMS_BY_COMMAND[normalizedCommand as SvgPathCommand];
}

function formatSvgPathNumber(value: number) {
  const normalizedValue = Object.is(value, -0) ? 0 : value;
  const roundedValue = Number(normalizedValue.toFixed(SVG_PATH_VALUE_PRECISION));

  return Number.isInteger(roundedValue)
    ? `${roundedValue}`
    : `${roundedValue}`;
}

function formatSvgPoint(point: Point) {
  return `${formatSvgPathNumber(point.x)} ${formatSvgPathNumber(point.y)}`;
}

function parseSvgPathSegments(pathData: string) {
  const tokens = pathData.match(SVG_PATH_TOKEN_PATTERN);

  if (!tokens) {
    return null;
  }

  const segments: RawSvgPathSegment[] = [];
  let activeCommand: string | null = null;
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index];

    if (isPathCommandToken(token)) {
      activeCommand = token;
      index += 1;
    }

    if (!activeCommand) {
      return null;
    }

    const normalizedCommand = activeCommand.toUpperCase();

    if (!SVG_PATH_SUPPORTED_COMMANDS.has(normalizedCommand)) {
      return null;
    }

    const paramCount = getPathCommandParamCount(activeCommand);

    if (paramCount === 0) {
      segments.push({ command: activeCommand, values: [] });
      activeCommand = null;
      continue;
    }

    let consumedValues = false;

    while (index < tokens.length && !isPathCommandToken(tokens[index])) {
      if (index + paramCount > tokens.length) {
        return null;
      }

      const values = tokens
        .slice(index, index + paramCount)
        .map((value) => Number.parseFloat(value));

      if (
        values.length !== paramCount ||
        values.some((value) => !Number.isFinite(value))
      ) {
        return null;
      }

      segments.push({ command: activeCommand, values });
      consumedValues = true;
      index += paramCount;

      if (activeCommand === "M") {
        activeCommand = "L";
      } else if (activeCommand === "m") {
        activeCommand = "l";
      }
    }

    if (!consumedValues) {
      return null;
    }
  }

  return segments;
}

function transformPoint(
  point: Point,
  options: SvgPathDataTransformOptions
) {
  return options.transformPoint?.(point) ?? point;
}

function transformArcRadii(
  rx: number,
  ry: number,
  options: SvgPathDataTransformOptions
) {
  return options.transformArcRadii?.({ rx, ry }) ?? { rx, ry };
}

function getAbsolutePoint(
  currentPoint: Point,
  x: number,
  y: number,
  relative: boolean
) {
  return relative
    ? { x: currentPoint.x + x, y: currentPoint.y + y }
    : { x, y };
}

function appendTransformedPoint(
  points: Point[],
  point: Point,
  options: SvgPathDataTransformOptions
) {
  const transformedPoint = transformPoint(point, options);

  points.push(transformedPoint);

  return transformedPoint;
}

export function transformSvgPathData(
  pathData: string,
  options: SvgPathDataTransformOptions = {}
): TransformedSvgPathData | null {
  const segments = parseSvgPathSegments(pathData);

  if (!segments) {
    return null;
  }

  const outputSegments: string[] = [];
  const points: Point[] = [];
  let closed = false;
  let currentPoint = { x: 0, y: 0 };
  let subpathStartPoint = currentPoint;

  segments.forEach((segment) => {
    const normalizedCommand = segment.command.toUpperCase();
    const relative = segment.command !== normalizedCommand;
    const values = segment.values;

    if (normalizedCommand === "M") {
      const point = getAbsolutePoint(currentPoint, values[0], values[1], relative);
      const transformedPoint = appendTransformedPoint(points, point, options);

      outputSegments.push(`M ${formatSvgPoint(transformedPoint)}`);
      currentPoint = point;
      subpathStartPoint = point;
      return;
    }

    if (normalizedCommand === "L") {
      const point = getAbsolutePoint(currentPoint, values[0], values[1], relative);
      const transformedPoint = appendTransformedPoint(points, point, options);

      outputSegments.push(`L ${formatSvgPoint(transformedPoint)}`);
      currentPoint = point;
      return;
    }

    if (normalizedCommand === "H") {
      const point = {
        x: relative ? currentPoint.x + values[0] : values[0],
        y: currentPoint.y
      };
      const transformedPoint = appendTransformedPoint(points, point, options);

      outputSegments.push(`L ${formatSvgPoint(transformedPoint)}`);
      currentPoint = point;
      return;
    }

    if (normalizedCommand === "V") {
      const point = {
        x: currentPoint.x,
        y: relative ? currentPoint.y + values[0] : values[0]
      };
      const transformedPoint = appendTransformedPoint(points, point, options);

      outputSegments.push(`L ${formatSvgPoint(transformedPoint)}`);
      currentPoint = point;
      return;
    }

    if (normalizedCommand === "C") {
      const controlPointA = getAbsolutePoint(
        currentPoint,
        values[0],
        values[1],
        relative
      );
      const controlPointB = getAbsolutePoint(
        currentPoint,
        values[2],
        values[3],
        relative
      );
      const point = getAbsolutePoint(currentPoint, values[4], values[5], relative);
      const transformedControlPointA = appendTransformedPoint(
        points,
        controlPointA,
        options
      );
      const transformedControlPointB = appendTransformedPoint(
        points,
        controlPointB,
        options
      );
      const transformedPoint = appendTransformedPoint(points, point, options);

      outputSegments.push(
        `C ${formatSvgPoint(transformedControlPointA)} ${formatSvgPoint(
          transformedControlPointB
        )} ${formatSvgPoint(transformedPoint)}`
      );
      currentPoint = point;
      return;
    }

    if (normalizedCommand === "S") {
      const controlPoint = getAbsolutePoint(
        currentPoint,
        values[0],
        values[1],
        relative
      );
      const point = getAbsolutePoint(currentPoint, values[2], values[3], relative);
      const transformedControlPoint = appendTransformedPoint(
        points,
        controlPoint,
        options
      );
      const transformedPoint = appendTransformedPoint(points, point, options);

      outputSegments.push(
        `S ${formatSvgPoint(transformedControlPoint)} ${formatSvgPoint(
          transformedPoint
        )}`
      );
      currentPoint = point;
      return;
    }

    if (normalizedCommand === "Q") {
      const controlPoint = getAbsolutePoint(
        currentPoint,
        values[0],
        values[1],
        relative
      );
      const point = getAbsolutePoint(currentPoint, values[2], values[3], relative);
      const transformedControlPoint = appendTransformedPoint(
        points,
        controlPoint,
        options
      );
      const transformedPoint = appendTransformedPoint(points, point, options);

      outputSegments.push(
        `Q ${formatSvgPoint(transformedControlPoint)} ${formatSvgPoint(
          transformedPoint
        )}`
      );
      currentPoint = point;
      return;
    }

    if (normalizedCommand === "T") {
      const point = getAbsolutePoint(currentPoint, values[0], values[1], relative);
      const transformedPoint = appendTransformedPoint(points, point, options);

      outputSegments.push(`T ${formatSvgPoint(transformedPoint)}`);
      currentPoint = point;
      return;
    }

    if (normalizedCommand === "A") {
      const point = getAbsolutePoint(currentPoint, values[5], values[6], relative);
      const transformedPoint = appendTransformedPoint(points, point, options);
      const radii = transformArcRadii(
        Math.abs(values[0]),
        Math.abs(values[1]),
        options
      );

      outputSegments.push(
        `A ${formatSvgPathNumber(Math.abs(radii.rx))} ${formatSvgPathNumber(
          Math.abs(radii.ry)
        )} ${formatSvgPathNumber(values[2])} ${values[3] ? 1 : 0} ${
          values[4] ? 1 : 0
        } ${formatSvgPoint(transformedPoint)}`
      );
      currentPoint = point;
      return;
    }

    if (normalizedCommand === "Z") {
      outputSegments.push("Z");
      currentPoint = subpathStartPoint;
      closed = true;
    }
  });

  if (points.length === 0 || outputSegments.length === 0) {
    return null;
  }

  return {
    closed,
    pathData: outputSegments.join(" "),
    points
  };
}
