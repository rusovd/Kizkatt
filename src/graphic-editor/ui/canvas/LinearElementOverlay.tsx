import {
  getElementBends,
  getElementCenter,
  getLinearElementPoints,
  getSegmentMidpoint,
  rotatePointAroundPoint
} from "../../geometry";
import type { KizkattElement } from "../../model/types";
import {
  LINE_BEND_HANDLE_RADIUS,
  LINE_ENDPOINT_HANDLE_RADIUS,
  LINE_INSERT_BEND_HANDLE_RADIUS,
  ROTATE_HANDLE_OFFSET,
  ROTATE_HANDLE_RADIUS
} from "./renderingConstants";

export function LinearElementOverlay({
  bends,
  element,
  linePoints,
  selectedBendIndex,
  showBounds = true,
  showBendHandles = true,
  showRotateHandle = true
}: {
  bends: ReturnType<typeof getElementBends>;
  element: KizkattElement;
  linePoints: ReturnType<typeof getLinearElementPoints>;
  selectedBendIndex?: number;
  showBounds?: boolean;
  showBendHandles?: boolean;
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
            cx={element.x}
            cy={element.y}
            r={LINE_ENDPOINT_HANDLE_RADIUS}
          />
          <circle
            className="kizkatt-endpoint-handle"
            data-handle="resize"
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
              {linePoints.slice(0, -1).map((point, index) => {
                const midpoint = getSegmentMidpoint(point, linePoints[index + 1]);

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
      {showRotateHandle && (
        <circle
          className="kizkatt-rotate-handle"
          data-handle="rotate"
          data-handle-world-x={rotateHandleWorldPoint.x}
          data-handle-world-y={rotateHandleWorldPoint.y}
          cx={rotateHandle.x}
          cy={rotateHandle.y}
          r={ROTATE_HANDLE_RADIUS}
        />
      )}
    </g>
  );
}
