import { RESIZE_HANDLES } from "../../config/constants";
import {
  getElementCenter,
  getResizeCursor,
  rotatePointAroundPoint,
  selectionBounds
} from "../../geometry";
import type { KizkattElement } from "../../model/types";

const HANDLE_SIZE = 8.5;
const HALF_HANDLE_SIZE = HANDLE_SIZE / 2;

export function ElementOverlay({
  element,
  showBounds = true,
  showRotateHandle = true
}: {
  element: KizkattElement;
  showBounds?: boolean;
  showRotateHandle?: boolean;
}) {
  const bounds = selectionBounds([element]);

  if (!bounds) {
    return null;
  }

  const rotateHandle = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y - 24
  };
  const rotateHandleWorldPoint = rotatePointAroundPoint(
    rotateHandle,
    getElementCenter(element),
    element.angle
  );

  return (
    <g className="kizkatt-selection-overlay">
      {showBounds && (
        <>
          <rect
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            fill="none"
          />
          {RESIZE_HANDLES.map(({ id, sx, sy }) => (
            <rect
              key={id}
              className="kizkatt-resize-handle"
              data-handle="resize"
              data-resize-handle={id}
              style={{ cursor: getResizeCursor(element.angle, id) }}
              x={bounds.x + ((sx + 1) * bounds.width) / 2 - HALF_HANDLE_SIZE}
              y={bounds.y + ((sy + 1) * bounds.height) / 2 - HALF_HANDLE_SIZE}
              width={HANDLE_SIZE}
              height={HANDLE_SIZE}
            />
          ))}
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
