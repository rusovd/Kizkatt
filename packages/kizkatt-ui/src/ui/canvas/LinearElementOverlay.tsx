import {
  getElementBends,
  getElementCenter,
  getLinearElementPoints,
  getLinearElementSegmentMidpoint,
  rotatePointAroundPoint
} from "kizkatt-graphic-engine";
import type { KizkattElement } from "../../model/types";
import {
  LINE_BEND_HANDLE_RADIUS,
  LINE_ENDPOINT_HANDLE_RADIUS,
  LINE_INSERT_BEND_HANDLE_RADIUS,
  ROTATE_HANDLE_OFFSET,
  ROTATE_HANDLE_RADIUS
} from "../../rendering/constants";
import { RotateHoverIcon, TransformCenterMarker } from "./ElementOverlay";

export function LinearElementOverlay({
  bends,
  element,
  endpointMode = "resize",
  linePoints,
  selectedBendIndex,
  showBounds = true,
  showBendHandles = true,
  showRotateHoverIcon = true,
  showRotateHandle = true
}: {
  bends: ReturnType<typeof getElementBends>;
  element: KizkattElement;
  endpointMode?: "node" | "resize";
  linePoints: ReturnType<typeof getLinearElementPoints>;
  selectedBendIndex?: number;
  showBounds?: boolean;
  showBendHandles?: boolean;
  showRotateHoverIcon?: boolean;
  showRotateHandle?: boolean;
}) {
  const center = getElementCenter(element);
  const rotateHandle = {
    x: center.x,
    y: center.y - ROTATE_HANDLE_OFFSET
  };
  const rotateHandleWorldPoint = rotatePointAroundPoint(
    rotateHandle,
    center,
    element.angle
  );

  return (
    <g className="kizkatt-line-overlay">
      {showBounds && (
        <>
          <circle
            className="kizkatt-endpoint-handle"
            data-endpoint-mode={endpointMode}
            data-handle="linear-endpoint"
            data-line-endpoint="start"
            cx={element.x}
            cy={element.y}
            r={LINE_ENDPOINT_HANDLE_RADIUS}
          />
          <circle
            className="kizkatt-endpoint-handle"
            data-endpoint-mode={endpointMode}
            data-handle="linear-endpoint"
            data-line-endpoint="end"
            cx={element.x + element.width}
            cy={element.y + element.height}
            r={LINE_ENDPOINT_HANDLE_RADIUS}
          />
          {showBendHandles && (
            <>
              {bends.map((bend, index) => (
                <circle
                  key={`bend-${index}`}
                  className={[
                    "kizkatt-bend-point-handle",
                    selectedBendIndex === index ? "is-selected" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  data-bend-index={index}
                  data-handle="bend"
                  data-selected-bend={selectedBendIndex === index}
                  cx={element.x + bend.x}
                  cy={element.y + bend.y}
                  r={LINE_BEND_HANDLE_RADIUS}
                />
              ))}
              {linePoints.slice(0, -1).map((_, index) => {
                const midpoint = getLinearElementSegmentMidpoint(
                  linePoints,
                  index,
                  element.edgeStyle
                );

                return (
                  <circle
                    key={`insert-${index}`}
                    className="kizkatt-bend-handle"
                    data-handle="bend"
                    data-segment-index={index}
                    cx={midpoint.x}
                    cy={midpoint.y}
                    r={LINE_INSERT_BEND_HANDLE_RADIUS}
                  />
                );
              })}
            </>
          )}
        </>
      )}
      {endpointMode !== "node" && (
        <TransformCenterMarker center={center} mode="resize" />
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
            r={ROTATE_HANDLE_RADIUS}
          />
          {showRotateHoverIcon && (
            <RotateHoverIcon x={rotateHandle.x} y={rotateHandle.y} />
          )}
        </>
      )}
    </g>
  );
}
