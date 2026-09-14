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
  LINE_BEND_HANDLE_RADIUS,
  LINE_ENDPOINT_HANDLE_RADIUS,
  LINE_INSERT_BEND_HANDLE_RADIUS,
  ROTATE_HANDLE_OFFSET,
  ROTATE_HANDLE_RADIUS
} from "../../rendering/constants";
import { RotateHoverIcon, TransformCenterMarker } from "./ElementOverlay";

const BEZIER_CONTROL_ARROW_SIZE = 15;
const BEZIER_CONTROL_HIT_RADIUS = 8;
const LINEAR_SEGMENT_HIT_STROKE_WIDTH = 14;

function getScreenScale(zoom = 1) {
  return 1 / Math.max(zoom, Number.EPSILON);
}

function getSegmentPath(
  linePoints: ReturnType<typeof getLinearElementPoints>,
  segmentControls: ReturnType<typeof getLinearElementSegmentControls>,
  segmentIndex: number
) {
  const start = linePoints[segmentIndex];
  const end = linePoints[segmentIndex + 1];
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

function BezierControlArrow({
  anchor,
  control,
  controlName,
  scale,
  segmentIndex
}: {
  anchor: { x: number; y: number };
  control: { x: number; y: number };
  controlName: "cp1" | "cp2";
  scale: number;
  segmentIndex: number;
}) {
  const size = BEZIER_CONTROL_ARROW_SIZE;
  const halfSize = size / HALF_DIVISOR;

  return (
    <g
      className="kizkatt-bezier-control-handle"
      data-control-point={controlName}
      data-handle="bezier-control"
      data-segment-index={segmentIndex}
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
  showBounds = true,
  showBendHandles = true,
  showBezierHandles = false,
  showRotateHoverIcon = true,
  showRotateHandle = true,
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
  showBezierHandles?: boolean;
  showBounds?: boolean;
  showBendHandles?: boolean;
  showRotateHoverIcon?: boolean;
  showRotateHandle?: boolean;
  zoom?: number;
}) {
  const screenScale = getScreenScale(zoom);
  const endpointRadius = LINE_ENDPOINT_HANDLE_RADIUS * screenScale;
  const bendPointRadius = (LINE_BEND_HANDLE_RADIUS / HALF_DIVISOR) * screenScale;
  const insertBendRadius =
    (LINE_INSERT_BEND_HANDLE_RADIUS / HALF_DIVISOR) * screenScale;
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
  const segmentControls = getLinearElementSegmentControls(element, linePoints);
  const selectedSegment =
    selectedSegmentIndex === undefined
      ? undefined
      : segmentControls[selectedSegmentIndex];
  const showInsertHandleForSegment = (segmentIndex: number) =>
    !showBezierHandles ||
    (selectedSegmentIndex !== undefined &&
      segmentIndex === selectedSegmentIndex);

  return (
    <g className="kizkatt-line-overlay">
      {showBounds && (
        <>
          {showBezierHandles &&
            linePoints.slice(0, -1).map((_, index) => {
              const path = getSegmentPath(linePoints, segmentControls, index);

              if (!path) {
                return null;
              }

              return (
                <path
                  key={`segment-hit-${index}`}
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
                  strokeWidth={LINEAR_SEGMENT_HIT_STROKE_WIDTH * screenScale}
                />
              );
            })}
          <circle
            className={[
              "kizkatt-endpoint-handle",
              selectedNodeSet.has(0) ? "is-selected" : ""
            ]
              .filter(Boolean)
              .join(" ")}
            data-endpoint-mode={endpointMode}
            data-handle="linear-endpoint"
            data-line-endpoint="start"
            data-linear-node-index={0}
            data-selected-node={selectedNodeSet.has(0)}
            cx={element.x}
            cy={element.y}
            fill={overlayFill}
            r={endpointRadius}
          />
          <circle
            className={[
              "kizkatt-endpoint-handle",
              selectedNodeSet.has(endNodeIndex) ? "is-selected" : ""
            ]
              .filter(Boolean)
              .join(" ")}
            data-endpoint-mode={endpointMode}
            data-handle="linear-endpoint"
            data-line-endpoint="end"
            data-linear-node-index={endNodeIndex}
            data-selected-node={selectedNodeSet.has(endNodeIndex)}
            cx={element.x + element.width}
            cy={element.y + element.height}
            fill={overlayFill}
            r={endpointRadius}
          />
          {showBendHandles && (
            <>
              {bends.map((bend, index) => (
                <circle
                  key={`bend-${index}`}
                  className={[
                    "kizkatt-bend-point-handle",
                    selectedBendIndex === index ||
                    selectedNodeSet.has(index + 1)
                      ? "is-selected"
                      : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  data-bend-index={index}
                  data-handle="bend"
                  data-linear-node-index={index + 1}
                  data-selected-bend={selectedBendIndex === index}
                  data-selected-node={selectedNodeSet.has(index + 1)}
                  cx={element.x + bend.x}
                  cy={element.y + bend.y}
                  fill={overlayFill}
                  r={bendPointRadius}
                />
              ))}
              {linePoints.slice(0, -1).map((_, index) => {
                if (!showInsertHandleForSegment(index)) {
                  return null;
                }

                const midpoint = getLinearElementSegmentMidpoint(
                  linePoints,
                  index,
                  element.edgeStyle,
                  segmentControls
                );

                return (
                  <circle
                    key={`insert-${index}`}
                    className="kizkatt-bend-handle"
                    data-handle="bend"
                    data-segment-index={index}
                    cx={midpoint.x}
                    cy={midpoint.y}
                    fill={overlayFill}
                    r={insertBendRadius}
                  />
                );
              })}
            </>
          )}
        </>
      )}
      {endpointMode !== "node" && (
        <TransformCenterMarker
          center={center}
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
            />
            <BezierControlArrow
              anchor={linePoints[selectedSegmentIndex + 1]}
              control={selectedSegment.cp2}
              controlName="cp2"
              scale={screenScale}
              segmentIndex={selectedSegmentIndex}
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
