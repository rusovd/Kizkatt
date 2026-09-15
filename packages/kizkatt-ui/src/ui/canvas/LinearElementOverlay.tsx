import {
  getElementBends,
  getElementCenter,
  getLinearElementPath,
  getLinearElementPoints,
  getLinearElementSegmentMidpoint,
  getLinearElementSegmentControls,
  rotatePointAroundPoint
} from "kizkatt-graphic-engine";
import type { KizkattElement } from "../../model/types";
import {
  HALF_DIVISOR,
  ROTATE_HANDLE_OFFSET,
  ROTATE_HANDLE_RADIUS
} from "../../rendering/constants";
import {
  getNodeEditLineCursor,
  getNodeEditPointCursor
} from "./cursors";
import { RotateHoverIcon, TransformCenterMarker } from "./ElementOverlay";
import type { KizkattTheme } from "../../model/types";

const BEZIER_CONTROL_ARROW_SIZE = 15;
const BEZIER_CONTROL_HIT_RADIUS = 8;
const LINEAR_SEGMENT_HIT_STROKE_WIDTH = 12;
const LINEAR_NODE_MARKER_SIZE = 8.4;
const LINEAR_NODE_PREVIEW_SIZE = 6;
const VIRTUAL_SEGMENT_BEND_HANDLE_RADIUS = 5;
const TRIANGLE_HEIGHT_FACTOR = 1.05;
const TRIANGLE_HALF_WIDTH_FACTOR = 0.58;
const SVG_CLOSE_PATH_COMMAND = " Z";

function getScreenScale(zoom = 1) {
  return 1 / Math.max(zoom, Number.EPSILON);
}

function getSegmentPath(
  linePoints: ReturnType<typeof getLinearElementPoints>,
  segmentControls: ReturnType<typeof getLinearElementSegmentControls>,
  segmentIndex: number,
  closed = false
) {
  const start = linePoints[segmentIndex];
  const end =
    closed && segmentIndex === linePoints.length - 1
      ? linePoints[0]
      : linePoints[segmentIndex + 1];
  const control = segmentControls[segmentIndex];

  if (!start || !end) {
    return "";
  }

  return getLinearElementPath(
    [start, end],
    "sharp",
    control?.mode === "curve" ? [control] : undefined
  );
}

function getControlAngle(anchor: { x: number; y: number }, control: { x: number; y: number }) {
  return (Math.atan2(control.y - anchor.y, control.x - anchor.x) * 180) / Math.PI;
}

function getPointAngle(
  start: { x: number; y: number },
  end: { x: number; y: number }
) {
  return (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;
}

function isSamePoint(first: { x: number; y: number }, second: { x: number; y: number }) {
  return first.x === second.x && first.y === second.y;
}

function getNodeShape(
  nodeIndex: number,
  segmentControls: ReturnType<typeof getLinearElementSegmentControls>,
  endNodeIndex: number,
  isClosedLine = false
) {
  if (isClosedLine && (nodeIndex === 0 || nodeIndex === endNodeIndex)) {
    const previousIsCurve = segmentControls[endNodeIndex - 1]?.mode === "curve";
    const nextIsCurve = segmentControls[0]?.mode === "curve";

    return previousIsCurve && nextIsCurve ? "circle" : "square";
  }

  if (nodeIndex === 0 || nodeIndex === endNodeIndex) {
    return "triangle";
  }

  const previousIsCurve = segmentControls[nodeIndex - 1]?.mode === "curve";
  const nextIsCurve = segmentControls[nodeIndex]?.mode === "curve";

  return previousIsCurve && nextIsCurve ? "circle" : "square";
}

function getEndpointNodeAngle(
  nodeIndex: number,
  linePoints: ReturnType<typeof getLinearElementPoints>
) {
  if (nodeIndex === 0) {
    return linePoints[1]
      ? getPointAngle(linePoints[0], linePoints[1])
      : 0;
  }

  const end = linePoints[linePoints.length - 1];
  const previous = linePoints[linePoints.length - 2];

  return previous && end ? getPointAngle(previous, end) : 0;
}

function getNodeMarkerClassName({
  isSelected,
  readOnly,
  type
}: {
  isSelected: boolean;
  readOnly: boolean;
  type: "bend" | "endpoint";
}) {
  return [
    type === "endpoint"
      ? "kizkatt-endpoint-handle"
      : "kizkatt-bend-point-handle",
    readOnly ? "kizkatt-linear-node-preview" : "",
    isSelected ? "is-selected" : ""
  ]
    .filter(Boolean)
    .join(" ");
}

function LinearNodeMarker({
  angle = 0,
  dataAttributes,
  fill,
  nodeIndex,
  point,
  readOnly = false,
  scale,
  selected = false,
  shape,
  theme = "dark",
  type
}: {
  angle?: number;
  dataAttributes?: Record<string, string | number | boolean | undefined>;
  fill: string;
  nodeIndex: number;
  point: { x: number; y: number };
  readOnly?: boolean;
  scale: number;
  selected?: boolean;
  shape: "circle" | "square" | "triangle";
  theme?: KizkattTheme;
  type: "bend" | "endpoint";
}) {
  const size = (readOnly ? LINEAR_NODE_PREVIEW_SIZE : LINEAR_NODE_MARKER_SIZE) *
    scale;
  const halfSize = size / HALF_DIVISOR;
  const className = getNodeMarkerClassName({
    isSelected: selected,
    readOnly,
    type
  });
  const commonProps = {
    ...(dataAttributes ?? {}),
    className,
    "data-linear-node-index": nodeIndex,
    "data-node-shape": shape,
    "data-selected-node": selected,
    fill,
    style: readOnly ? undefined : { cursor: getNodeEditPointCursor(theme) }
  };

  if (shape === "circle") {
    return (
      <circle
        {...commonProps}
        cx={point.x}
        cy={point.y}
        r={halfSize}
      />
    );
  }

  if (shape === "square") {
    return (
      <rect
        {...commonProps}
        height={size}
        width={size}
        x={point.x - halfSize}
        y={point.y - halfSize}
      />
    );
  }

  const triangleHeight = size * TRIANGLE_HEIGHT_FACTOR;
  const triangleHalfWidth = size * TRIANGLE_HALF_WIDTH_FACTOR;
  const path = [
    `M ${triangleHeight / HALF_DIVISOR} 0`,
    `L ${-triangleHeight / HALF_DIVISOR} ${-triangleHalfWidth}`,
    `L ${-triangleHeight / HALF_DIVISOR} ${triangleHalfWidth}`,
    "Z"
  ].join(" ");

  return (
    <path
      {...commonProps}
      d={path}
      transform={`translate(${point.x} ${point.y}) rotate(${angle})`}
    />
  );
}

function BezierControlArrow({
  anchor,
  control,
  controlName,
  scale,
  segmentIndex,
  theme
}: {
  anchor: { x: number; y: number };
  control: { x: number; y: number };
  controlName: "cp1" | "cp2";
  scale: number;
  segmentIndex: number;
  theme: KizkattTheme;
}) {
  const size = BEZIER_CONTROL_ARROW_SIZE;
  const halfSize = size / HALF_DIVISOR;

  return (
    <g
      className="kizkatt-bezier-control-handle"
      data-control-point={controlName}
      data-handle="bezier-control"
      data-segment-index={segmentIndex}
      style={{ cursor: getNodeEditPointCursor(theme) }}
      transform={`translate(${control.x} ${control.y}) rotate(${getControlAngle(
        anchor,
        control
      )}) scale(${scale})`}
    >
      <circle
        className="kizkatt-bezier-control-hit"
        r={BEZIER_CONTROL_HIT_RADIUS}
      />
      <path
        className="kizkatt-bezier-control-arrow"
        d={`M ${-halfSize} ${-halfSize * 0.45} L ${halfSize} 0 L ${-halfSize} ${
          halfSize * 0.45
        } M ${halfSize * 0.35} 0 L ${-halfSize} 0`}
      />
    </g>
  );
}

export function LinearElementOverlay({
  canvasBackgroundColor,
  bends,
  element,
  endpointMode = "resize",
  linePoints,
  selectedBendIndex,
  selectedNodeIndices,
  selectedSegmentIndex,
  segmentBendActive = false,
  segmentBendHandlePoint,
  showBounds = true,
  showBendHandles = true,
  showBezierHandles = false,
  showNodePreview = false,
  showRotateHoverIcon = true,
  showRotateHandle = true,
  showTransformCenter = true,
  theme = "dark",
  zoom = 1
}: {
  canvasBackgroundColor?: string;
  bends: ReturnType<typeof getElementBends>;
  element: KizkattElement;
  endpointMode?: "node" | "resize";
  linePoints: ReturnType<typeof getLinearElementPoints>;
  selectedBendIndex?: number;
  selectedNodeIndices?: number[];
  selectedSegmentIndex?: number;
  segmentBendActive?: boolean;
  segmentBendHandlePoint?: { x: number; y: number };
  showBezierHandles?: boolean;
  showBounds?: boolean;
  showBendHandles?: boolean;
  showNodePreview?: boolean;
  showRotateHoverIcon?: boolean;
  showRotateHandle?: boolean;
  showTransformCenter?: boolean;
  theme?: KizkattTheme;
  zoom?: number;
}) {
  const screenScale = getScreenScale(zoom);
  const insertBendRadius = VIRTUAL_SEGMENT_BEND_HANDLE_RADIUS * screenScale;
  const rotateHandleOffset = ROTATE_HANDLE_OFFSET * screenScale;
  const rotateHandleRadius = ROTATE_HANDLE_RADIUS * screenScale;
  const overlayFill = canvasBackgroundColor ?? "var(--kizkatt-canvas-bg)";
  const center = getElementCenter(element);
  const rotateHandle = {
    x: center.x,
    y: center.y - rotateHandleOffset
  };
  const rotateHandleWorldPoint = rotatePointAroundPoint(
    rotateHandle,
    center,
    element.angle
  );
  const selectedNodeSet = new Set(selectedNodeIndices ?? []);
  const endNodeIndex = bends.length + 1;
  const isClosedLine = Boolean(element.closed);
  const hasMergedEndpoints = isSamePoint(
    linePoints[0],
    linePoints[endNodeIndex]
  );
  const shouldHideDuplicateEnd = hasMergedEndpoints;
  const segmentControls = getLinearElementSegmentControls(element, linePoints);
  const segmentIndices = segmentControls.map((_, index) => index);
  const selectedSegment =
    selectedSegmentIndex === undefined
      ? undefined
      : segmentControls[selectedSegmentIndex];
  const showInsertHandleForSegment = (segmentIndex: number) =>
    !showBezierHandles && selectedSegmentIndex === segmentIndex;
  const isReadOnlyNodePreview = endpointMode !== "node" && showNodePreview;
  const showNodeEditLineOverlay = endpointMode === "node";
  const nodeEditLinePath = showNodeEditLineOverlay
    ? `${getLinearElementPath(
        linePoints,
        element.edgeStyle,
        segmentControls,
        isClosedLine
      )}${
        element.closed ? SVG_CLOSE_PATH_COMMAND : ""
      }`
    : "";
  const activeSegmentBendHandle =
    segmentBendHandlePoint && selectedSegmentIndex !== undefined ? (
      <circle
        className="kizkatt-bend-handle kizkatt-bend-handle--virtual"
        data-handle="linear-segment-bend"
        data-segment-index={selectedSegmentIndex}
        data-virtual-node="true"
        cx={segmentBendHandlePoint.x}
        cy={segmentBendHandlePoint.y}
        fill={overlayFill}
        r={insertBendRadius}
        style={{ cursor: getNodeEditPointCursor(theme) }}
      />
    ) : null;

  return (
    <g className="kizkatt-line-overlay">
      {showBounds && (
        <>
          {showBezierHandles &&
            segmentIndices.map((index) => {
              const path = getSegmentPath(
                linePoints,
                segmentControls,
                index,
                isClosedLine
              );

              if (!path) {
                return null;
              }

              return (
                <g key={`segment-hit-${index}`}>
                  <path
                    className={[
                      "kizkatt-linear-segment-hit",
                      selectedSegmentIndex === index ? "is-selected" : ""
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    data-handle="linear-segment"
                    data-segment-index={index}
                    d={path}
                    fill="none"
                    style={{
                      cursor: segmentBendActive
                        ? getNodeEditPointCursor(theme)
                        : getNodeEditLineCursor(theme)
                    }}
                    strokeWidth={LINEAR_SEGMENT_HIT_STROKE_WIDTH}
                  />
                  {selectedSegmentIndex === index && (
                    <path
                      className="kizkatt-linear-segment-selection"
                      d={path}
                      fill="none"
                    />
                  )}
                </g>
              );
            })}
          {showNodeEditLineOverlay && (
            <path
              className="kizkatt-linear-path-overlay"
              d={nodeEditLinePath}
              fill="none"
            />
          )}
          {isReadOnlyNodePreview ? (
            linePoints.map((point, index) => {
              if (shouldHideDuplicateEnd && index === endNodeIndex) {
                return null;
              }

              const shape = getNodeShape(
                index,
                segmentControls,
                endNodeIndex,
                isClosedLine || hasMergedEndpoints
              );

              return (
                <LinearNodeMarker
                  key={`node-preview-${index}`}
                  angle={
                    shape === "triangle"
                      ? getEndpointNodeAngle(index, linePoints)
                      : 0
                  }
                  fill={shape === "triangle" ? overlayFill : "#f7f7fb"}
                  nodeIndex={index}
                  point={point}
                  readOnly
                  scale={screenScale}
                  shape={shape}
                  theme={theme}
                  type={shape === "triangle" ? "endpoint" : "bend"}
                />
              );
            })
          ) : (
            <>
              {(() => {
                const startShape = getNodeShape(
                  0,
                  segmentControls,
                  endNodeIndex,
                  isClosedLine || hasMergedEndpoints
                );

                return (
                  <LinearNodeMarker
                    dataAttributes={{
                      "data-endpoint-mode": endpointMode,
                      "data-handle": "linear-endpoint",
                      "data-line-endpoint": "start"
                    }}
                    fill={overlayFill}
                    nodeIndex={0}
                    point={linePoints[0]}
                    angle={
                      startShape === "triangle"
                        ? getEndpointNodeAngle(0, linePoints)
                        : 0
                    }
                    scale={screenScale}
                    selected={selectedNodeSet.has(0)}
                    shape={startShape}
                    theme={theme}
                    type={startShape === "triangle" ? "endpoint" : "bend"}
                  />
                );
              })()}
              {!shouldHideDuplicateEnd &&
                (() => {
                  const endShape = getNodeShape(
                    endNodeIndex,
                    segmentControls,
                    endNodeIndex,
                    isClosedLine
                  );

                  return (
                    <LinearNodeMarker
                      dataAttributes={{
                        "data-endpoint-mode": endpointMode,
                        "data-handle": "linear-endpoint",
                        "data-line-endpoint": "end"
                      }}
                      fill={overlayFill}
                      nodeIndex={endNodeIndex}
                      point={linePoints[endNodeIndex]}
                      angle={
                        endShape === "triangle"
                          ? getEndpointNodeAngle(endNodeIndex, linePoints)
                          : 0
                      }
                      scale={screenScale}
                      selected={selectedNodeSet.has(endNodeIndex)}
                      shape={endShape}
                      theme={theme}
                      type={endShape === "triangle" ? "endpoint" : "bend"}
                    />
                  );
                })()}
              {showBendHandles && (
                <>
                  {bends.map((bend, index) => {
                    const nodeIndex = index + 1;
                    const shape = getNodeShape(
                      nodeIndex,
                      segmentControls,
                      endNodeIndex,
                      isClosedLine || hasMergedEndpoints
                    );
                    const isSelected =
                      selectedBendIndex === index ||
                      selectedNodeSet.has(nodeIndex);

                    return (
                      <LinearNodeMarker
                        key={`bend-${index}`}
                        dataAttributes={{
                          "data-bend-index": index,
                          "data-handle": "bend",
                          "data-selected-bend": selectedBendIndex === index
                        }}
                        fill={overlayFill}
                        nodeIndex={nodeIndex}
                        point={{
                          x: element.x + bend.x,
                          y: element.y + bend.y
                        }}
                        scale={screenScale}
                        selected={isSelected}
                        shape={shape}
                        theme={theme}
                        type="bend"
                      />
                    );
                  })}
                  {activeSegmentBendHandle}
                  {segmentIndices.map((index) => {
                    if (segmentBendHandlePoint) {
                      return null;
                    }

                    if (!showInsertHandleForSegment(index)) {
                      return null;
                    }

                    const midpoint = getLinearElementSegmentMidpoint(
                      linePoints,
                      index,
                      element.edgeStyle,
                      segmentControls,
                      isClosedLine
                    );

                    return (
                      <circle
                        key={`insert-${index}`}
                        className="kizkatt-bend-handle kizkatt-bend-handle--virtual"
                        data-handle="linear-segment-bend"
                        data-segment-index={index}
                        data-virtual-node="true"
                        cx={midpoint.x}
                        cy={midpoint.y}
                        fill={overlayFill}
                        r={insertBendRadius}
                        style={{ cursor: getNodeEditPointCursor(theme) }}
                      />
                    );
                  })}
                </>
              )}
            </>
          )}
        </>
      )}
      {!showBounds && showNodeEditLineOverlay && (
        <path
          className="kizkatt-linear-path-overlay"
          d={nodeEditLinePath}
          fill="none"
        />
      )}
      {!showBounds && showBendHandles && activeSegmentBendHandle}
      {endpointMode !== "node" && showTransformCenter && (
        <TransformCenterMarker
          center={center}
          interactive={false}
          mode="resize"
          scale={screenScale}
        />
      )}
      {showBezierHandles &&
        selectedSegmentIndex !== undefined &&
        selectedSegment?.mode === "curve" &&
        selectedSegment.cp1 &&
        selectedSegment.cp2 && (
          <g className="kizkatt-bezier-handles">
            <line
              className="kizkatt-bezier-handle-line"
              x1={linePoints[selectedSegmentIndex].x}
              y1={linePoints[selectedSegmentIndex].y}
              x2={selectedSegment.cp1.x}
              y2={selectedSegment.cp1.y}
            />
            <line
              className="kizkatt-bezier-handle-line"
              x1={linePoints[selectedSegmentIndex + 1].x}
              y1={linePoints[selectedSegmentIndex + 1].y}
              x2={selectedSegment.cp2.x}
              y2={selectedSegment.cp2.y}
            />
            <BezierControlArrow
              anchor={linePoints[selectedSegmentIndex]}
              control={selectedSegment.cp1}
              controlName="cp1"
              scale={screenScale}
              segmentIndex={selectedSegmentIndex}
              theme={theme}
            />
            <BezierControlArrow
              anchor={linePoints[selectedSegmentIndex + 1]}
              control={selectedSegment.cp2}
              controlName="cp2"
              scale={screenScale}
              segmentIndex={selectedSegmentIndex}
              theme={theme}
            />
          </g>
        )}
      {endpointMode !== "node" && showRotateHandle && (
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
