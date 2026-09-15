import { RESIZE_HANDLES } from "../../config/constants";
import {
  getElementTransformedCorners,
  getElementCenter,
  getElementLocalPoint,
  getResizeCursor,
  getSelectionTransformHandleLayout,
  rotatePointAroundPoint,
  selectionBounds,
  transformElementPoint
} from "kizkatt-graphic-engine";
import type {
  KizkattElement,
  Point,
  SelectionTransformMode,
  SkewHandle
} from "../../model/types";
import {
  HALF_DIVISOR,
  ROTATE_HOVER_ICON_OFFSET,
  ROTATE_HOVER_ICON_SIZE,
  ROTATE_HANDLE_OFFSET,
  ROTATE_HANDLE_RADIUS,
  CORNER_ROTATE_HANDLE_OFFSET_MULTIPLIER,
  SELECTION_HANDLE_ALIGNMENT_OFFSET,
  SELECTION_HANDLE_SIZE,
  SKEW_HANDLE_ICON_CORNER_RADIUS,
  SKEW_HANDLE_ICON_VIEWBOX_SIZE,
  SKEW_HANDLE_SIZE_MULTIPLIER,
  SVG_FILL_NONE
} from "../../rendering/constants";
import { ArcArrowsIcon } from "../icons";
import { TargetPointIcon } from "../icons";

const SKEW_HANDLE_SIZE = SELECTION_HANDLE_SIZE * SKEW_HANDLE_SIZE_MULTIPLIER;
const CORNER_ROTATE_HANDLE_OFFSET =
  SELECTION_HANDLE_SIZE * CORNER_ROTATE_HANDLE_OFFSET_MULTIPLIER;
const CORNER_ROTATE_ARROW_SHAFT_PATH =
  "M4 14 C4.4 8.6 8.4 4.6 14 4.1 L14.2 6.4 C9.9 6.9 6.9 10.1 6.4 14.2 Z";
const CORNER_ROTATE_ARROW_HEAD_PATH = "M14 1.7 L18.6 4 L14.4 7 Z";
const POLYGON_POINT_SEPARATOR = " ";
const SVG_POLYGON_CLOSE_COMMAND = " Z";

function getScreenScale(zoom = 1) {
  return 1 / Math.max(zoom, Number.EPSILON);
}

function getPointListPath(points: Point[]) {
  const [firstPoint, ...remainingPoints] = points;

  if (!firstPoint) {
    return "";
  }

  return [
    `M ${firstPoint.x} ${firstPoint.y}`,
    ...remainingPoints.map((point) => `L ${point.x} ${point.y}`),
    SVG_POLYGON_CLOSE_COMMAND
  ].join(POLYGON_POINT_SEPARATOR);
}

function getPointBounds(points: Point[]) {
  const firstPoint = points[0];

  if (!firstPoint) {
    return null;
  }

  return points.reduce(
    (currentBounds, point) => ({
      maxX: Math.max(currentBounds.maxX, point.x),
      maxY: Math.max(currentBounds.maxY, point.y),
      minX: Math.min(currentBounds.minX, point.x),
      minY: Math.min(currentBounds.minY, point.y)
    }),
    {
      maxX: firstPoint.x,
      maxY: firstPoint.y,
      minX: firstPoint.x,
      minY: firstPoint.y
    }
  );
}

function getMidpoint(firstPoint: Point, secondPoint: Point) {
  return {
    x: (firstPoint.x + secondPoint.x) / HALF_DIVISOR,
    y: (firstPoint.y + secondPoint.y) / HALF_DIVISOR
  };
}

function getResizeHandlePoints(points: Point[]) {
  const [topLeft, topRight, bottomRight, bottomLeft] = points;

  return {
    e: getMidpoint(topRight, bottomRight),
    n: getMidpoint(topLeft, topRight),
    ne: topRight,
    nw: topLeft,
    s: getMidpoint(bottomRight, bottomLeft),
    se: bottomRight,
    sw: bottomLeft,
    w: getMidpoint(bottomLeft, topLeft)
  };
}

function RotateHoverIcon({
  scale = 1,
  x,
  y
}: {
  scale?: number;
  x: number;
  y: number;
}) {
  const size = ROTATE_HOVER_ICON_SIZE * scale;

  return (
    <g
      className="kizkatt-rotate-hover-icon"
      transform={`translate(${x - size / HALF_DIVISOR} ${
        y - ROTATE_HOVER_ICON_OFFSET * scale
      }) scale(${scale})`}
    >
      {ArcArrowsIcon}
    </g>
  );
}

export function TransformCenterMarker({
  center,
  getWorldPoint,
  interactive = false,
  mode,
  scale = 1
}: {
  center: Point;
  getWorldPoint?: (point: Point) => Point;
  interactive?: boolean;
  mode: SelectionTransformMode;
  scale?: number;
}) {
  const worldPoint = getWorldPoint?.(center) ?? center;
  const isSkewMode = mode === "skew";

  if (isSkewMode) {
    return (
      <g
        className={[
          "kizkatt-transform-center-marker",
          "kizkatt-transform-center-marker--target",
          interactive ? "is-interactive" : ""
        ]
          .filter(Boolean)
          .join(" ")}
        data-handle={interactive ? "transform-center" : undefined}
        data-handle-world-x={worldPoint.x}
        data-handle-world-y={worldPoint.y}
        transform={`translate(${center.x} ${center.y})`}
      >
        {interactive && (
          <circle
            className="kizkatt-transform-center-marker-hit"
            data-handle="transform-center"
            data-handle-world-x={worldPoint.x}
            data-handle-world-y={worldPoint.y}
            r={12 * scale}
          />
        )}
        <g transform={`scale(${scale}) translate(-9 -9) scale(0.75)`}>
          {TargetPointIcon}
        </g>
      </g>
    );
  }

  return (
    <g
      className={[
        "kizkatt-transform-center-marker",
        "kizkatt-transform-center-marker--cross",
        interactive ? "is-interactive" : ""
      ]
        .filter(Boolean)
        .join(" ")}
      data-handle={interactive ? "transform-center" : undefined}
      data-handle-world-x={worldPoint.x}
      data-handle-world-y={worldPoint.y}
      transform={`translate(${center.x} ${center.y})`}
    >
      {interactive && (
        <circle
          className="kizkatt-transform-center-marker-hit"
          r={10 * scale}
        />
      )}
      <path
        d={`M${-4 * scale} ${-4 * scale} ${4 * scale} ${
          4 * scale
        } M${4 * scale} ${-4 * scale} ${-4 * scale} ${4 * scale}`}
      />
    </g>
  );
}

function EdgeSkewHandle({
  bounds,
  handle,
  scale = 1
}: {
  bounds: NonNullable<ReturnType<typeof selectionBounds>>;
  handle: SkewHandle;
  scale?: number;
}) {
  const isHorizontal = handle === "top" || handle === "bottom";
  const cornerRotateHandleOffset = CORNER_ROTATE_HANDLE_OFFSET * scale;
  const skewHandleSize = SKEW_HANDLE_SIZE * scale;
  const halfSkewHandleSize = skewHandleSize / HALF_DIVISOR;
  const x = isHorizontal
    ? bounds.x + bounds.width / HALF_DIVISOR
    : handle === "left"
    ? bounds.x - cornerRotateHandleOffset
    : bounds.x + bounds.width + cornerRotateHandleOffset;
  const y = isHorizontal
    ? handle === "top"
      ? bounds.y - cornerRotateHandleOffset
      : bounds.y + bounds.height + cornerRotateHandleOffset
    : bounds.y + bounds.height / HALF_DIVISOR;
  const d = isHorizontal
    ? "M2 6 L6 2 M2 6 L6 10 M2 6 H14 M18 6 L14 2 M18 6 L14 10 M18 6 H6"
    : "M6 2 L2 6 M6 2 L10 6 M6 2 V14 M6 18 L2 14 M6 18 L10 14 M6 18 V6";

  return (
    <g
      className="kizkatt-skew-handle"
      data-handle="skew"
      data-skew-handle={handle}
      style={{ cursor: isHorizontal ? "ew-resize" : "ns-resize" }}
      transform={`translate(${x - halfSkewHandleSize} ${
        y - halfSkewHandleSize
      }) scale(${skewHandleSize / SKEW_HANDLE_ICON_VIEWBOX_SIZE})`}
    >
      <rect
        x="0"
        y="0"
        width={SKEW_HANDLE_ICON_VIEWBOX_SIZE}
        height={SKEW_HANDLE_ICON_VIEWBOX_SIZE}
        rx={SKEW_HANDLE_ICON_CORNER_RADIUS}
      />
      <path d={d} />
    </g>
  );
}

function WorldEdgeSkewHandle({
  handle,
  point,
  scale = 1
}: {
  handle: SkewHandle;
  point: Point;
  scale?: number;
}) {
  const isHorizontal = handle === "top" || handle === "bottom";
  const skewHandleSize = SKEW_HANDLE_SIZE * scale;
  const halfSkewHandleSize = skewHandleSize / HALF_DIVISOR;
  const d = isHorizontal
    ? "M2 6 L6 2 M2 6 L6 10 M2 6 H14 M18 6 L14 2 M18 6 L14 10 M18 6 H6"
    : "M6 2 L2 6 M6 2 L10 6 M6 2 V14 M6 18 L2 14 M6 18 L10 14 M6 18 V6";

  return (
    <g
      className="kizkatt-skew-handle"
      data-handle="skew"
      data-handle-world-x={point.x}
      data-handle-world-y={point.y}
      data-skew-handle={handle}
      style={{ cursor: isHorizontal ? "ew-resize" : "ns-resize" }}
      transform={`translate(${point.x - halfSkewHandleSize} ${
        point.y - halfSkewHandleSize
      }) scale(${skewHandleSize / SKEW_HANDLE_ICON_VIEWBOX_SIZE})`}
    >
      <rect
        x="0"
        y="0"
        width={SKEW_HANDLE_ICON_VIEWBOX_SIZE}
        height={SKEW_HANDLE_ICON_VIEWBOX_SIZE}
        rx={SKEW_HANDLE_ICON_CORNER_RADIUS}
      />
      <path d={d} />
    </g>
  );
}

function CornerRotateHandle({
  bounds,
  corner,
  getWorldPoint,
  scale = 1
}: {
  bounds: NonNullable<ReturnType<typeof selectionBounds>>;
  corner: "nw" | "ne" | "se" | "sw";
  getWorldPoint?: (point: { x: number; y: number }) => {
    x: number;
    y: number;
  };
  scale?: number;
}) {
  const cornerRotateHandleOffset = CORNER_ROTATE_HANDLE_OFFSET * scale;
  const skewHandleSize = SKEW_HANDLE_SIZE * scale;
  const halfSkewHandleSize = skewHandleSize / HALF_DIVISOR;
  const x =
    corner === "nw" || corner === "sw"
      ? bounds.x - cornerRotateHandleOffset
      : bounds.x + bounds.width + cornerRotateHandleOffset;
  const y =
    corner === "nw" || corner === "ne"
      ? bounds.y - cornerRotateHandleOffset
      : bounds.y + bounds.height + cornerRotateHandleOffset;
  const worldPoint = getWorldPoint?.({ x, y }) ?? { x, y };
  const iconTransformByCorner = {
    ne: "translate(20 0) scale(-1 1)",
    nw: "translate(0 0)",
    se: "translate(20 20) scale(-1 -1)",
    sw: "translate(0 20) scale(1 -1)"
  };

  return (
    <g
      className="kizkatt-corner-rotate-handle"
      data-handle="rotate"
      data-handle-world-x={worldPoint.x}
      data-handle-world-y={worldPoint.y}
      transform={`translate(${x - halfSkewHandleSize} ${
        y - halfSkewHandleSize
      }) scale(${skewHandleSize / SKEW_HANDLE_ICON_VIEWBOX_SIZE})`}
    >
      <rect
        x="0"
        y="0"
        width={SKEW_HANDLE_ICON_VIEWBOX_SIZE}
        height={SKEW_HANDLE_ICON_VIEWBOX_SIZE}
        rx={SKEW_HANDLE_ICON_CORNER_RADIUS}
      />
      <g transform={iconTransformByCorner[corner]}>
        <path d={CORNER_ROTATE_ARROW_SHAFT_PATH} />
        <path d={CORNER_ROTATE_ARROW_HEAD_PATH} />
      </g>
    </g>
  );
}

function WorldCornerRotateHandle({
  corner,
  point,
  scale = 1
}: {
  corner: "nw" | "ne" | "se" | "sw";
  point: Point;
  scale?: number;
}) {
  const skewHandleSize = SKEW_HANDLE_SIZE * scale;
  const halfSkewHandleSize = skewHandleSize / HALF_DIVISOR;
  const iconTransformByCorner = {
    ne: "translate(20 0) scale(-1 1)",
    nw: "translate(0 0)",
    se: "translate(20 20) scale(-1 -1)",
    sw: "translate(0 20) scale(1 -1)"
  };

  return (
    <g
      className="kizkatt-corner-rotate-handle"
      data-handle="rotate"
      data-handle-world-x={point.x}
      data-handle-world-y={point.y}
      transform={`translate(${point.x - halfSkewHandleSize} ${
        point.y - halfSkewHandleSize
      }) scale(${skewHandleSize / SKEW_HANDLE_ICON_VIEWBOX_SIZE})`}
    >
      <rect
        x="0"
        y="0"
        width={SKEW_HANDLE_ICON_VIEWBOX_SIZE}
        height={SKEW_HANDLE_ICON_VIEWBOX_SIZE}
        rx={SKEW_HANDLE_ICON_CORNER_RADIUS}
      />
      <g transform={iconTransformByCorner[corner]}>
        <path d={CORNER_ROTATE_ARROW_SHAFT_PATH} />
        <path d={CORNER_ROTATE_ARROW_HEAD_PATH} />
      </g>
    </g>
  );
}

export function SkewOverlayHandles({
  bounds,
  getWorldPoint,
  zoom = 1
}: {
  bounds: NonNullable<ReturnType<typeof selectionBounds>>;
  getWorldPoint?: (point: { x: number; y: number }) => {
    x: number;
    y: number;
  };
  zoom?: number;
}) {
  const screenScale = getScreenScale(zoom);

  return (
    <>
      {(["top", "right", "bottom", "left"] as const).map((handle) => (
        <EdgeSkewHandle
          key={handle}
          bounds={bounds}
          handle={handle}
          scale={screenScale}
        />
      ))}
      {(["nw", "ne", "se", "sw"] as const).map((corner) => (
        <CornerRotateHandle
          key={corner}
          bounds={bounds}
          corner={corner}
          getWorldPoint={getWorldPoint}
          scale={screenScale}
        />
      ))}
    </>
  );
}

export function WorldSkewOverlay({
  center,
  points,
  zoom = 1
}: {
  center?: Point;
  points: Point[];
  zoom?: number;
}) {
  if (points.length < 4) {
    return null;
  }

  const pointBounds = getPointBounds(points);

  if (!pointBounds) {
    return null;
  }

  const { maxX, maxY, minX, minY } = pointBounds;
  const screenScale = getScreenScale(zoom);
  const handleLayout = getSelectionTransformHandleLayout(
    {
      height: maxY - minY,
      width: maxX - minX,
      x: minX,
      y: minY
    },
    CORNER_ROTATE_HANDLE_OFFSET * screenScale
  );
  const edgeHandles = (["top", "right", "bottom", "left"] as const).map(
    (handle) => ({ handle, point: handleLayout.edges[handle] })
  );
  const cornerHandles = (["nw", "ne", "se", "sw"] as const).map(
    (corner) => ({ corner, point: handleLayout.corners[corner] })
  );

  return (
    <g className="kizkatt-selection-overlay kizkatt-selection-overlay--world">
      <path
        className="kizkatt-world-selection-outline"
        d={getPointListPath(points)}
        fill={SVG_FILL_NONE}
      />
      {edgeHandles.map(({ handle, point }) => (
        <WorldEdgeSkewHandle
          key={handle}
          handle={handle}
          point={point}
          scale={screenScale}
        />
      ))}
      {cornerHandles.map(({ corner, point }) => (
        <WorldCornerRotateHandle
          key={corner}
          corner={corner}
          point={point}
          scale={screenScale}
        />
      ))}
      {center && (
        <TransformCenterMarker
          center={center}
          interactive
          mode="skew"
          scale={screenScale}
        />
      )}
    </g>
  );
}

export function WorldResizeOverlay({
  center,
  element,
  zoom = 1
}: {
  center?: Point | null;
  element: KizkattElement;
  zoom?: number;
}) {
  const points = getElementTransformedCorners(element);

  if (points.length < 4) {
    return null;
  }

  const handlePoints = getResizeHandlePoints(points);
  const screenScale = getScreenScale(zoom);
  const handleSize = SELECTION_HANDLE_SIZE * screenScale;
  const halfHandleSize = handleSize / HALF_DIVISOR;

  return (
    <g
      className="kizkatt-selection-overlay kizkatt-selection-overlay--world"
      data-element-overlay-id={element.id}
      data-element-overlay-variant="primary"
    >
      <path
        className="kizkatt-world-selection-outline"
        d={getPointListPath(points)}
        fill={SVG_FILL_NONE}
      />
      {RESIZE_HANDLES.map(({ id }) => {
        const point = handlePoints[id];

        return (
          <rect
            key={id}
            className="kizkatt-resize-handle"
            data-handle="resize"
            data-resize-handle={id}
            style={{
              cursor: getResizeCursor(
                element.angle,
                id,
                element.flipX,
                element.flipY
              )
            }}
            x={point.x - halfHandleSize}
            y={point.y - halfHandleSize}
            width={handleSize}
            height={handleSize}
          />
        );
      })}
      <TransformCenterMarker
        center={center ?? getElementCenter(element)}
        interactive={false}
        mode="resize"
        scale={screenScale}
      />
    </g>
  );
}

export function ElementOverlay({
  element,
  internal = false,
  selectionTransformCenter = null,
  selectionTransformMode = "resize",
  showBounds = true,
  showResizeHandles = true,
  showRotateHoverIcon = true,
  showRotateHandle = true,
  zoom = 1
}: {
  element: KizkattElement;
  internal?: boolean;
  selectionTransformCenter?: Point | null;
  selectionTransformMode?: SelectionTransformMode;
  showBounds?: boolean;
  showResizeHandles?: boolean;
  showRotateHoverIcon?: boolean;
  showRotateHandle?: boolean;
  zoom?: number;
}) {
  const bounds = selectionBounds([element]);

  if (!bounds) {
    return null;
  }

  const screenScale = getScreenScale(zoom);
  const handleSize = SELECTION_HANDLE_SIZE * screenScale;
  const halfHandleSize = handleSize / HALF_DIVISOR;
  const rotateHandleOffset = ROTATE_HANDLE_OFFSET * screenScale;
  const rotateHandleRadius = ROTATE_HANDLE_RADIUS * screenScale;
  const rotateHandle = {
    x: bounds.x + bounds.width / HALF_DIVISOR,
    y: bounds.y - rotateHandleOffset
  };
  const rotateHandleWorldPoint = rotatePointAroundPoint(
    rotateHandle,
    getElementCenter(element),
    element.angle
  );
  const isSkewMode = selectionTransformMode === "skew";
  const centerMarkerPoint = selectionTransformCenter
    ? getElementLocalPoint(element, selectionTransformCenter)
    : getElementCenter(element);

  return (
    <g
      className={[
        "kizkatt-selection-overlay",
        internal ? "kizkatt-selection-overlay--internal" : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showBounds && (
        <>
          <rect
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            fill={SVG_FILL_NONE}
          />
          {showResizeHandles && !isSkewMode &&
            RESIZE_HANDLES.map(({ id, sx, sy }) => (
              <rect
                key={id}
                className="kizkatt-resize-handle"
                data-handle="resize"
                data-resize-handle={id}
                style={{
                  cursor: getResizeCursor(
                    element.angle,
                    id,
                    element.flipX,
                    element.flipY
                  )
                }}
                x={
                  bounds.x +
                  ((sx + SELECTION_HANDLE_ALIGNMENT_OFFSET) * bounds.width) /
                    HALF_DIVISOR -
                  halfHandleSize
                }
                y={
                  bounds.y +
                  ((sy + SELECTION_HANDLE_ALIGNMENT_OFFSET) * bounds.height) /
                    HALF_DIVISOR -
                  halfHandleSize
                }
                width={handleSize}
                height={handleSize}
              />
            ))}
          {showResizeHandles && isSkewMode && (
            <SkewOverlayHandles
              bounds={bounds}
              getWorldPoint={(point) => transformElementPoint(element, point)}
              zoom={zoom}
            />
          )}
        </>
      )}
      {!internal && (
        <TransformCenterMarker
          center={centerMarkerPoint}
          getWorldPoint={(point) => transformElementPoint(element, point)}
          interactive={isSkewMode}
          mode={selectionTransformMode}
          scale={screenScale}
        />
      )}
      {showRotateHandle && !isSkewMode && (
        <>
          <circle
            className="kizkatt-rotate-handle"
            data-handle="rotate"
            data-handle-world-x={rotateHandleWorldPoint.x}
            data-handle-world-y={rotateHandleWorldPoint.y}
            cx={rotateHandle.x}
            cy={rotateHandle.y}
            r={rotateHandleRadius}
          />
          {showRotateHoverIcon && (
            <RotateHoverIcon
              scale={screenScale}
              x={rotateHandle.x}
              y={rotateHandle.y}
            />
          )}
        </>
      )}
    </g>
  );
}

export { RotateHoverIcon };
