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
  LinearSegmentControl,
  LinearEndpoint,
  Point
} from "../model/types";
import {
  getElementEnd,
  getElementLocalPoint,
  getElementLocalVector,
  getSegmentMidpoint,
  transformElementPoint
} from "./primitives";

const MIN_LINEAR_SCALE_DENOMINATOR = 0.000001;
const CUBIC_SEGMENT_HIT_SAMPLES = 64;

function getProjectedPointOnSegment(
  point: Point,
  start: Point,
  end: Point
) {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
  const t =
    segmentLengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((point.x - start.x) * segmentX +
              (point.y - start.y) * segmentY) /
              segmentLengthSquared
          )
        );
  const projectedPoint = {
    x: start.x + t * segmentX,
    y: start.y + t * segmentY
  };

  return {
    distanceSquared:
      (point.x - projectedPoint.x) * (point.x - projectedPoint.x) +
      (point.y - projectedPoint.y) * (point.y - projectedPoint.y),
    point: projectedPoint,
    t
  };
}

function getNearestLinearSegmentPosition(
  point: Point,
  linePoints: Point[],
  segmentControls: LinearSegmentWorldControl[],
  closed = false
) {
  let nearestSegmentIndex = FIRST_ARRAY_INDEX;
  let nearestSegmentPosition = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  const segmentCount =
    hasImplicitClosingSegment(linePoints, closed)
      ? linePoints.length
      : Math.max(0, linePoints.length - NEXT_ARRAY_INDEX_OFFSET);

  for (
    let index = FIRST_ARRAY_INDEX;
    index < segmentCount;
    index += NEXT_ARRAY_INDEX_OFFSET
  ) {
    const start = linePoints[index];
    const end =
      index === linePoints.length - NEXT_ARRAY_INDEX_OFFSET
        ? linePoints[FIRST_ARRAY_INDEX]
        : linePoints[index + NEXT_ARRAY_INDEX_OFFSET];
    const segmentControl = segmentControls[index];

    if (
      segmentControl?.mode === "curve" &&
      segmentControl.cp1 &&
      segmentControl.cp2
    ) {
      let previousPoint = start;

      for (
        let sampleIndex = 1;
        sampleIndex <= CUBIC_SEGMENT_HIT_SAMPLES;
        sampleIndex += 1
      ) {
        const samplePosition = sampleIndex / CUBIC_SEGMENT_HIT_SAMPLES;
        const samplePoint = getCubicBezierPoint(
          start,
          segmentControl.cp1,
          segmentControl.cp2,
          end,
          samplePosition
        );
        const projection = getProjectedPointOnSegment(
          point,
          previousPoint,
          samplePoint
        );

        if (projection.distanceSquared < nearestDistance) {
          nearestDistance = projection.distanceSquared;
          nearestSegmentIndex = index;
          nearestSegmentPosition =
            (sampleIndex - 1 + projection.t) / CUBIC_SEGMENT_HIT_SAMPLES;
        }

        previousPoint = samplePoint;
      }

      continue;
    }

    const projection = getProjectedPointOnSegment(point, start, end);

    if (projection.distanceSquared < nearestDistance) {
      nearestDistance = projection.distanceSquared;
      nearestSegmentIndex = index;
      nearestSegmentPosition = projection.t;
    }
  }

  return {
    index: nearestSegmentIndex,
    t: nearestSegmentPosition
  };
}

function lerpPoint(start: Point, end: Point, t: number) {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t
  };
}

function hasImplicitClosingSegment(points: Point[], closed = false) {
  const first = points[FIRST_ARRAY_INDEX];
  const last = points[points.length - NEXT_ARRAY_INDEX_OFFSET];

  return Boolean(
    closed &&
      points.length > LINEAR_PATH_MIN_POINT_COUNT &&
      first &&
      last &&
      (first.x !== last.x || first.y !== last.y)
  );
}

function splitCubicBezierSegment(
  start: Point,
  cp1: Point,
  cp2: Point,
  end: Point,
  t: number
) {
  const p01 = lerpPoint(start, cp1, t);
  const p12 = lerpPoint(cp1, cp2, t);
  const p23 = lerpPoint(cp2, end, t);
  const p012 = lerpPoint(p01, p12, t);
  const p123 = lerpPoint(p12, p23, t);
  const point = lerpPoint(p012, p123, t);

  return {
    first: {
      cp1: p01,
      cp2: p012,
      mode: "curve" as const
    },
    point,
    second: {
      cp1: p123,
      cp2: p23,
      mode: "curve" as const
    }
  };
}

function getLocalLinearSegmentControl(
  element: KizkattElement,
  control: LinearSegmentWorldControl
): LinearSegmentControl {
  return control.mode === "curve" && control.cp1 && control.cp2
    ? {
        cp1: toLocalControlPoint(element, control.cp1),
        cp2: toLocalControlPoint(element, control.cp2),
        mode: "curve"
      }
    : { mode: "line" };
}

export function insertLinearElementBend(
  element: KizkattElement,
  worldPoint: Point,
  requestedSegmentIndex?: number
) {
  const localPoint = getElementLocalPoint(element, worldPoint);
  const linePoints = getLinearElementPoints(element);
  const segmentControls = getLinearElementSegmentControls(element, linePoints);
  const nearestSegment = getNearestLinearSegmentPosition(
    localPoint,
    linePoints,
    segmentControls,
    Boolean(element.closed)
  );
  const nearestSegmentIndex =
    requestedSegmentIndex !== undefined &&
    Number.isInteger(requestedSegmentIndex) &&
    requestedSegmentIndex >= FIRST_ARRAY_INDEX &&
    requestedSegmentIndex < segmentControls.length
      ? requestedSegmentIndex
      : nearestSegment.index;

  const bends = getElementBends(element);
  const segmentStart = linePoints[nearestSegmentIndex];
  const segmentEnd =
    nearestSegmentIndex === linePoints.length - NEXT_ARRAY_INDEX_OFFSET
      ? linePoints[FIRST_ARRAY_INDEX]
      : linePoints[nearestSegmentIndex + NEXT_ARRAY_INDEX_OFFSET];
  const segmentControl = segmentControls[nearestSegmentIndex];

  if (!segmentStart || !segmentEnd || !segmentControl) {
    return null;
  }

  const segmentPosition =
    requestedSegmentIndex === nearestSegmentIndex
      ? getNearestLinearSegmentPosition(
          localPoint,
          [segmentStart, segmentEnd],
          [segmentControl]
        ).t
      : nearestSegment.t;
  const splitSegment =
    segmentControl?.mode === "curve" &&
    segmentControl.cp1 &&
    segmentControl.cp2
      ? splitCubicBezierSegment(
          segmentStart,
          segmentControl.cp1,
          segmentControl.cp2,
          segmentEnd,
          segmentPosition
        )
      : null;
  const projectedPoint =
    splitSegment?.point ??
    getProjectedPointOnSegment(localPoint, segmentStart, segmentEnd).point;
  const nextBend = {
    x: projectedPoint.x - element.x,
    y: projectedPoint.y - element.y
  };
  const nextSegmentControls = segmentControls.flatMap((control, index) => {
    if (index !== nearestSegmentIndex) {
      return [getLocalLinearSegmentControl(element, control)];
    }

    if (splitSegment) {
      return [
        getLocalLinearSegmentControl(element, splitSegment.first),
        getLocalLinearSegmentControl(element, splitSegment.second)
      ];
    }

    return [{ mode: "line" as const }, { mode: "line" as const }];
  });

  return {
    bendIndex: nearestSegmentIndex,
    element: {
      ...element,
      bends: [
        ...bends.slice(FIRST_ARRAY_INDEX, nearestSegmentIndex),
        nextBend,
        ...bends.slice(nearestSegmentIndex)
      ],
      linearSegmentControls: nextSegmentControls,
      curve: undefined
    }
  };
}

export function getNearestLinearElementSegmentIndex(
  element: KizkattElement,
  worldPoint: Point
) {
  const localPoint = getElementLocalPoint(element, worldPoint);
  const linePoints = getLinearElementPoints(element);
  const segmentControls = getLinearElementSegmentControls(element, linePoints);

  return getNearestLinearSegmentPosition(
    localPoint,
    linePoints,
    segmentControls,
    Boolean(element.closed)
  ).index;
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

export type LinearSegmentWorldControl = {
  cp1?: Point;
  cp2?: Point;
  mode: "curve" | "line";
};

function toWorldControlPoint(element: KizkattElement, point?: Point) {
  return point
    ? {
        x: element.x + point.x,
        y: element.y + point.y
      }
    : undefined;
}

function toLocalControlPoint(element: KizkattElement, point: Point) {
  return {
    x: point.x - element.x,
    y: point.y - element.y
  };
}

export function getDefaultLinearSegmentControl(
  element: KizkattElement,
  segmentIndex: number,
  points = getLinearElementPoints(element)
): LinearSegmentControl {
  const { cp1, cp2 } = getLinearElementCubicControlPoints(
    points,
    segmentIndex,
    Boolean(element.closed)
  );

  return {
    cp1: toLocalControlPoint(element, cp1),
    cp2: toLocalControlPoint(element, cp2),
    mode: "curve"
  };
}

export function getLinearElementSegmentControls(
  element: KizkattElement,
  points = getLinearElementPoints(element)
): LinearSegmentWorldControl[] {
  const segmentCount =
    hasImplicitClosingSegment(points, Boolean(element.closed))
      ? points.length
      : Math.max(0, points.length - NEXT_ARRAY_INDEX_OFFSET);

  return Array.from({ length: segmentCount }, (_, index) => {
    const configured = element.linearSegmentControls?.[index];

    if (configured?.mode === "line") {
      return { mode: "line" };
    }

    if (configured?.mode === "curve") {
      const fallback = getDefaultLinearSegmentControl(element, index, points);

      return {
        cp1: toWorldControlPoint(element, configured.cp1 ?? fallback.cp1),
        cp2: toWorldControlPoint(element, configured.cp2 ?? fallback.cp2),
        mode: "curve"
      };
    }

    if (
      (element.edgeStyle ?? DEFAULT_EDGE_STYLE) !== SHARP_EDGE_STYLE &&
      points.length > LINEAR_PATH_STRAIGHT_POINT_COUNT
    ) {
      return {
        ...getLinearElementCubicControlPoints(
          points,
          index,
          Boolean(element.closed)
        ),
        mode: "curve"
      };
    }

    return { mode: "line" };
  });
}

function translatePoint(point: Point, delta: Point) {
  return {
    x: point.x + delta.x,
    y: point.y + delta.y
  };
}

function getTransformedLinearSegmentControls(
  element: KizkattElement,
  points: Point[]
) {
  return getLinearElementSegmentControls(element, points).map((control) =>
    control.mode === "curve" && control.cp1 && control.cp2
      ? {
          cp1: transformElementPoint(element, control.cp1),
          cp2: transformElementPoint(element, control.cp2),
          mode: "curve" as const
        }
      : { mode: "line" as const }
  );
}

function rebuildLinearElementFromWorldGeometry(
  element: KizkattElement,
  worldPoints: Point[],
  worldControls: LinearSegmentWorldControl[]
) {
  const start = worldPoints[FIRST_ARRAY_INDEX];
  const end = worldPoints[worldPoints.length - NEXT_ARRAY_INDEX_OFFSET];

  if (!start || !end) {
    return element;
  }

  const nextCenter = {
    x: (start.x + end.x) / HALF_DIVISOR,
    y: (start.y + end.y) / HALF_DIVISOR
  };
  const nextSize = getElementLocalVector(element, {
    x: end.x - start.x,
    y: end.y - start.y
  });
  const nextElement = {
    ...element,
    height: nextSize.y,
    width: nextSize.x,
    x: nextCenter.x - nextSize.x / HALF_DIVISOR,
    y: nextCenter.y - nextSize.y / HALF_DIVISOR
  };
  const toNextLocalPoint = (point: Point) => {
    const localPoint = getElementLocalPoint(nextElement, point);

    return {
      x: localPoint.x - nextElement.x,
      y: localPoint.y - nextElement.y
    };
  };

  return {
    ...nextElement,
    bends: worldPoints
      .slice(NEXT_ARRAY_INDEX_OFFSET, -NEXT_ARRAY_INDEX_OFFSET)
      .map(toNextLocalPoint),
    curve: undefined,
    linearSegmentControls: worldControls.map((control) =>
      control.mode === "curve" && control.cp1 && control.cp2
        ? {
            cp1: toNextLocalPoint(control.cp1),
            cp2: toNextLocalPoint(control.cp2),
            mode: "curve" as const
          }
        : { mode: "line" as const }
    )
  };
}

export function moveLinearElementNodes(
  element: KizkattElement,
  selectedNodeIndices: number[],
  worldDelta: Point
) {
  const localPoints = getLinearElementPoints(element);
  const endNodeIndex = localPoints.length - NEXT_ARRAY_INDEX_OFFSET;
  const selectedNodeSet = new Set(
    selectedNodeIndices.filter(
      (index) => Number.isInteger(index) && index >= 0 && index <= endNodeIndex
    )
  );
  const hasMergedClosedEndpoint =
    Boolean(element.closed) &&
    localPoints.length > NEXT_ARRAY_INDEX_OFFSET &&
    localPoints[FIRST_ARRAY_INDEX].x === localPoints[endNodeIndex].x &&
    localPoints[FIRST_ARRAY_INDEX].y === localPoints[endNodeIndex].y;

  if (
    hasMergedClosedEndpoint &&
    (selectedNodeSet.has(FIRST_ARRAY_INDEX) ||
      selectedNodeSet.has(endNodeIndex))
  ) {
    selectedNodeSet.add(FIRST_ARRAY_INDEX);
    selectedNodeSet.add(endNodeIndex);
  }

  const nextSelectedNodeIndices = Array.from(selectedNodeSet).sort(
    (first, second) => first - second
  );

  if (nextSelectedNodeIndices.length === EMPTY_COLLECTION_LENGTH) {
    return { element, selectedNodeIndices: nextSelectedNodeIndices };
  }

  const worldPoints = localPoints.map((point, index) => {
    const worldPoint = transformElementPoint(element, point);

    return selectedNodeSet.has(index)
      ? translatePoint(worldPoint, worldDelta)
      : worldPoint;
  });
  const worldControls = getTransformedLinearSegmentControls(
    element,
    localPoints
  ).map((control, segmentIndex) => {
    if (control.mode !== "curve" || !control.cp1 || !control.cp2) {
      return control;
    }

    const segmentEndNodeIndex =
      Boolean(element.closed) && segmentIndex === endNodeIndex
        ? FIRST_ARRAY_INDEX
        : segmentIndex + NEXT_ARRAY_INDEX_OFFSET;

    return {
      cp1: selectedNodeSet.has(segmentIndex)
        ? translatePoint(control.cp1, worldDelta)
        : control.cp1,
      cp2: selectedNodeSet.has(segmentEndNodeIndex)
        ? translatePoint(control.cp2, worldDelta)
        : control.cp2,
      mode: "curve" as const
    };
  });

  return {
    element: rebuildLinearElementFromWorldGeometry(
      element,
      worldPoints,
      worldControls
    ),
    selectedNodeIndices: nextSelectedNodeIndices
  };
}

export function moveLinearElementSegment(
  element: KizkattElement,
  segmentIndex: number,
  worldDelta: Point
) {
  const points = getLinearElementPoints(element);
  const segmentControls = getLinearElementSegmentControls(element, points);

  if (
    !Number.isInteger(segmentIndex) ||
    segmentIndex < FIRST_ARRAY_INDEX ||
    segmentIndex >= segmentControls.length
  ) {
    return { element, selectedNodeIndices: [] };
  }

  const endNodeIndex =
    Boolean(element.closed) &&
    segmentIndex === points.length - NEXT_ARRAY_INDEX_OFFSET
      ? FIRST_ARRAY_INDEX
      : segmentIndex + NEXT_ARRAY_INDEX_OFFSET;

  return moveLinearElementNodes(
    element,
    [segmentIndex, endNodeIndex],
    worldDelta
  );
}

export function bendLinearElementSegment(
  element: KizkattElement,
  segmentIndex: number,
  worldPoint: Point
) {
  const localPoint = getElementLocalPoint(element, worldPoint);
  const linePoints = getLinearElementPoints(element);
  const start = linePoints[segmentIndex];
  const end =
    Boolean(element.closed) && segmentIndex === linePoints.length - 1
      ? linePoints[FIRST_ARRAY_INDEX]
      : linePoints[segmentIndex + NEXT_ARRAY_INDEX_OFFSET];

  if (!start || !end) {
    return null;
  }

  const midpoint = getSegmentMidpoint(start, end);
  const offset = {
    x: (localPoint.x - midpoint.x) * (4 / 3),
    y: (localPoint.y - midpoint.y) * (4 / 3)
  };
  const cp1 = {
    x: start.x + (end.x - start.x) / 3 + offset.x,
    y: start.y + (end.y - start.y) / 3 + offset.y
  };
  const cp2 = {
    x: end.x - (end.x - start.x) / 3 + offset.x,
    y: end.y - (end.y - start.y) / 3 + offset.y
  };
  const nextControls = getLinearElementSegmentControls(
    element,
    linePoints
  ).map((control) => getLocalLinearSegmentControl(element, control));

  nextControls[segmentIndex] = {
    cp1: toLocalControlPoint(element, cp1),
    cp2: toLocalControlPoint(element, cp2),
    mode: "curve"
  };

  return {
    ...element,
    edgeStyle: element.edgeStyle ?? DEFAULT_EDGE_STYLE,
    linearSegmentControls: nextControls
  };
}

export function getLinearElementPath(
  points: Point[],
  edgeStyle: KizkattElement["edgeStyle"] = DEFAULT_EDGE_STYLE,
  segmentControls?: LinearSegmentWorldControl[],
  closed = false
) {
  if (points.length === EMPTY_COLLECTION_LENGTH) {
    return EMPTY_PATH_DATA;
  }

  if (points.length === LINEAR_PATH_MIN_POINT_COUNT) {
    return `${SVG_MOVE_COMMAND} ${points[FIRST_ARRAY_INDEX].x} ${
      points[FIRST_ARRAY_INDEX].y
    }`;
  }

  const hasExplicitCurveControls = segmentControls?.some(
    (control) => control.mode === "curve" && control.cp1 && control.cp2
  );

  if (
    points.length === LINEAR_PATH_STRAIGHT_POINT_COUNT &&
    !closed &&
    !hasExplicitCurveControls
  ) {
    return `${SVG_MOVE_COMMAND} ${points[FIRST_ARRAY_INDEX].x} ${
      points[FIRST_ARRAY_INDEX].y
    } ${SVG_LINE_COMMAND} ${points[NEXT_ARRAY_INDEX_OFFSET].x} ${
      points[NEXT_ARRAY_INDEX_OFFSET].y
    }`;
  }

  if (edgeStyle === SHARP_EDGE_STYLE && !hasExplicitCurveControls) {
    const commands = points
      .map((point, index) => {
        const command =
          index === FIRST_ARRAY_INDEX ? SVG_MOVE_COMMAND : SVG_LINE_COMMAND;

        return `${command} ${point.x} ${point.y}`;
      });

    if (hasImplicitClosingSegment(points, closed)) {
      commands.push(
        `${SVG_LINE_COMMAND} ${points[FIRST_ARRAY_INDEX].x} ${
          points[FIRST_ARRAY_INDEX].y
        }`
      );
    }

    return commands.join(SVG_COMMAND_SEPARATOR);
  }

  const commands = [
    `${SVG_MOVE_COMMAND} ${points[FIRST_ARRAY_INDEX].x} ${
      points[FIRST_ARRAY_INDEX].y
    }`
  ];

  const segmentCount =
    hasImplicitClosingSegment(points, closed)
      ? points.length
      : points.length - NEXT_ARRAY_INDEX_OFFSET;

  for (
    let index = FIRST_ARRAY_INDEX;
    index < segmentCount;
    index += NEXT_ARRAY_INDEX_OFFSET
  ) {
    const next =
      index === points.length - NEXT_ARRAY_INDEX_OFFSET
        ? points[FIRST_ARRAY_INDEX]
        : points[index + NEXT_ARRAY_INDEX_OFFSET];
    const segmentControl = segmentControls?.[index];

    if (
      segmentControl?.mode === "line" ||
      (edgeStyle === SHARP_EDGE_STYLE && !segmentControl)
    ) {
      commands.push(`${SVG_LINE_COMMAND} ${next.x} ${next.y}`);
      continue;
    }

    const { cp1, cp2 } =
      segmentControl?.mode === "curve" &&
      segmentControl.cp1 &&
      segmentControl.cp2
        ? { cp1: segmentControl.cp1, cp2: segmentControl.cp2 }
        : getLinearElementCubicControlPoints(points, index, closed);

    commands.push(
      `${SVG_CUBIC_COMMAND} ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${next.x} ${next.y}`
    );
  }

  return commands.join(SVG_COMMAND_SEPARATOR);
}

export function getLinearElementCubicControlPoints(
  points: Point[],
  index: number,
  closed = false
) {
  const previous =
    closed && index === FIRST_ARRAY_INDEX
      ? points[points.length - NEXT_ARRAY_INDEX_OFFSET]
      : points[Math.max(FIRST_ARRAY_INDEX, index - NEXT_ARRAY_INDEX_OFFSET)];
  const current = points[index];
  const next =
    closed && index === points.length - NEXT_ARRAY_INDEX_OFFSET
      ? points[FIRST_ARRAY_INDEX]
      : points[index + NEXT_ARRAY_INDEX_OFFSET];
  const nextNext =
    closed && index >= points.length - LINEAR_PATH_STRAIGHT_POINT_COUNT
      ? points[
          (index + LINEAR_PATH_STRAIGHT_POINT_COUNT) %
            points.length
        ]
      : points[
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

export function getCubicBezierPoint(
  start: Point,
  cp1: Point,
  cp2: Point,
  end: Point,
  t: number
) {
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

function getCubicBezierMidpoint(
  start: Point,
  cp1: Point,
  cp2: Point,
  end: Point
) {
  return getCubicBezierPoint(start, cp1, cp2, end, 1 / HALF_DIVISOR);
}

export function getLinearElementSamplePoints(
  element: KizkattElement,
  samplesPerCurveSegment = 24
) {
  const points = getLinearElementPoints(element);
  const segmentControls = getLinearElementSegmentControls(element, points);
  const samplePoints: Point[] = [];
  const segmentCount =
    hasImplicitClosingSegment(points, Boolean(element.closed))
      ? points.length
      : Math.max(0, points.length - NEXT_ARRAY_INDEX_OFFSET);

  Array.from({ length: segmentCount }, (_, index) => {
    const start = points[index];
    const end =
      index === points.length - NEXT_ARRAY_INDEX_OFFSET
        ? points[FIRST_ARRAY_INDEX]
        : points[index + NEXT_ARRAY_INDEX_OFFSET];
    const segmentControl = segmentControls[index];

    if (index === FIRST_ARRAY_INDEX) {
      samplePoints.push(start);
    }

    if (
      segmentControl?.mode === "curve" &&
      segmentControl.cp1 &&
      segmentControl.cp2
    ) {
      for (
        let sampleIndex = 1;
        sampleIndex <= samplesPerCurveSegment;
        sampleIndex += 1
      ) {
        samplePoints.push(
          getCubicBezierPoint(
            start,
            segmentControl.cp1,
            segmentControl.cp2,
            end,
            sampleIndex / samplesPerCurveSegment
          )
        );
      }
    } else {
      samplePoints.push(end);
    }
  });

  return samplePoints;
}

export function getLinearElementSegmentMidpoint(
  points: Point[],
  index: number,
  edgeStyle: KizkattElement["edgeStyle"] = DEFAULT_EDGE_STYLE,
  segmentControls?: LinearSegmentWorldControl[],
  closed = false
) {
  const start = points[index];
  const end =
    closed && index === points.length - NEXT_ARRAY_INDEX_OFFSET
      ? points[FIRST_ARRAY_INDEX]
      : points[index + NEXT_ARRAY_INDEX_OFFSET];
  const segmentControl = segmentControls?.[index];

  if (
    segmentControl?.mode === "curve" &&
    segmentControl.cp1 &&
    segmentControl.cp2
  ) {
    return getCubicBezierMidpoint(
      start,
      segmentControl.cp1,
      segmentControl.cp2,
      end
    );
  }

  if (
    segmentControl?.mode === "line" ||
    edgeStyle === SHARP_EDGE_STYLE ||
    points.length <= LINEAR_PATH_STRAIGHT_POINT_COUNT
  ) {
    return getSegmentMidpoint(start, end);
  }

  const { cp1, cp2 } = getLinearElementCubicControlPoints(
    points,
    index,
    closed
  );

  return getCubicBezierMidpoint(start, cp1, cp2, end);
}
