import { RESIZE_HANDLES } from "../../config/constants";
import {
  getElementCenter,
  getResizeCursor,
  rotatePointAroundPoint,
  selectionBounds
} from "../../geometry";
import type { KizkattElement } from "../../model/types";
import {
  HALF_DIVISOR,
  ROTATE_HOVER_ICON_OFFSET,
  ROTATE_HOVER_ICON_SIZE,
  ROTATE_HANDLE_OFFSET,
  ROTATE_HANDLE_RADIUS,
  SELECTION_HANDLE_ALIGNMENT_OFFSET,
  SELECTION_HANDLE_SIZE,
  SVG_FILL_NONE
} from "./renderingConstants";
import { ArcArrowsIcon } from "../icons";

const HALF_HANDLE_SIZE = SELECTION_HANDLE_SIZE / HALF_DIVISOR;

function RotateHoverIcon({ x, y }: { x: number; y: number }) {
  return (
    <g
      className="kizkatt-rotate-hover-icon"
      transform={`translate(${x - ROTATE_HOVER_ICON_SIZE / HALF_DIVISOR} ${
        y - ROTATE_HOVER_ICON_OFFSET
      })`}
    >
      {ArcArrowsIcon}
    </g>
  );
}

export function ElementOverlay({
  element,
  internal = false,
  showBounds = true,
  showResizeHandles = true,
  showRotateHoverIcon = true,
  showRotateHandle = true
}: {
  element: KizkattElement;
  internal?: boolean;
  showBounds?: boolean;
  showResizeHandles?: boolean;
  showRotateHoverIcon?: boolean;
  showRotateHandle?: boolean;
}) {
  const bounds = selectionBounds([element]);

  if (!bounds) {
    return null;
  }

  const rotateHandle = {
    x: bounds.x + bounds.width / HALF_DIVISOR,
    y: bounds.y - ROTATE_HANDLE_OFFSET
  };
  const rotateHandleWorldPoint = rotatePointAroundPoint(
    rotateHandle,
    getElementCenter(element),
    element.angle
  );

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
          {showResizeHandles &&
            RESIZE_HANDLES.map(({ id, sx, sy }) => (
              <rect
                key={id}
                className="kizkatt-resize-handle"
                data-handle="resize"
                data-resize-handle={id}
                style={{ cursor: getResizeCursor(element.angle, id) }}
                x={
                  bounds.x +
                  ((sx + SELECTION_HANDLE_ALIGNMENT_OFFSET) * bounds.width) /
                    HALF_DIVISOR -
                  HALF_HANDLE_SIZE
                }
                y={
                  bounds.y +
                  ((sy + SELECTION_HANDLE_ALIGNMENT_OFFSET) * bounds.height) /
                    HALF_DIVISOR -
                  HALF_HANDLE_SIZE
                }
                width={SELECTION_HANDLE_SIZE}
                height={SELECTION_HANDLE_SIZE}
              />
            ))}
        </>
      )}
      {showRotateHandle && (
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

export { RotateHoverIcon };
