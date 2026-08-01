import {
  getElementBends,
  getElementCenter,
  getLinearElementPoints,
  getSegmentMidpoint,
  rotatePointAroundPoint
} from "../../geometry";
import type { KizkattElement } from "../../model/types";

export function LinearElementOverlay({
  bends,
  element,
  linePoints,
  showBounds = true,
  showBendHandles = true,
  showRotateHandle = true
}: {
  bends: ReturnType<typeof getElementBends>;
  element: KizkattElement;
  linePoints: ReturnType<typeof getLinearElementPoints>;
  showBounds?: boolean;
  showBendHandles?: boolean;
  showRotateHandle?: boolean;
}) {
  const center = getElementCenter(element);
  const rotateHandle = {
    x: center.x,
    y: center.y - 24
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
            r={5}
          />
          <circle
            className="kizkatt-endpoint-handle"
            data-handle="resize"
            cx={element.x + element.width}
            cy={element.y + element.height}
            r={5}
          />
          {showBendHandles && (
            <>
              {bends.map((bend, index) => (
                <circle
                  key={`bend-${index}`}
                  className="kizkatt-bend-point-handle"
                  data-bend-index={index}
                  data-handle="bend"
                  cx={element.x + bend.x}
                  cy={element.y + bend.y}
                  r={8}
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
                    r={6}
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
          r={5}
        />
      )}
    </g>
  );
}
