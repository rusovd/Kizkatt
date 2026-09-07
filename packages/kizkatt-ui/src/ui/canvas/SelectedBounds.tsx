import { RESIZE_HANDLES, SINGLE_SELECTION_COUNT } from "../../config/constants";
import { getResizeCursor, selectionBounds } from "kizkatt-graphic-engine";
import type {
  Interaction,
  KizkattElement,
  Point,
  SelectionTransformMode
} from "../../model/types";
import {
  HALF_DIVISOR,
  ROTATE_HANDLE_OFFSET,
  ROTATE_HANDLE_RADIUS,
  SELECTION_HANDLE_ALIGNMENT_OFFSET,
  SELECTION_HANDLE_SIZE,
  SVG_FILL_NONE
} from "../../rendering/constants";
import {
  RotateHoverIcon,
  SkewOverlayHandles,
  TransformCenterMarker
} from "./ElementOverlay";

const HALF_HANDLE_SIZE = SELECTION_HANDLE_SIZE / HALF_DIVISOR;

export function SelectedBounds({
  elements,
  interaction,
  selectionTransformCenter = null,
  selectionTransformMode = "resize",
  showRotateHandle = true,
  showRotateHoverIcon = true
}: {
  elements: KizkattElement[];
  interaction: Interaction | null;
  selectionTransformCenter?: Point | null;
  selectionTransformMode?: SelectionTransformMode;
  showRotateHandle?: boolean;
  showRotateHoverIcon?: boolean;
}) {
  const bounds = selectionBounds(elements, { includeRotation: true });

  if (!bounds || elements.length === SINGLE_SELECTION_COUNT) {
    return null;
  }
  const isRotating = interaction?.type === "rotate";
  const isSkewing = interaction?.type === "skew";
  const isSkewMode = selectionTransformMode === "skew";
  const center = selectionTransformCenter ?? {
    x: bounds.x + bounds.width / HALF_DIVISOR,
    y: bounds.y + bounds.height / HALF_DIVISOR
  };
  const rotateHandle = {
    x: isRotating
      ? interaction.center.x +
        Math.cos(interaction.currentAngle) * interaction.handleRadius
      : bounds.x + bounds.width / HALF_DIVISOR,
    y: isRotating
      ? interaction.center.y +
        Math.sin(interaction.currentAngle) * interaction.handleRadius
      : bounds.y - ROTATE_HANDLE_OFFSET
  };

  return (
    <g className="kizkatt-selection-overlay kizkatt-group-selection">
      {!isRotating && !isSkewing && (
        <>
          <rect
            className="kizkatt-multi-selection"
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            fill={SVG_FILL_NONE}
          />
          {isSkewMode ? (
            <SkewOverlayHandles bounds={bounds} />
          ) : (
            RESIZE_HANDLES.map(({ id, sx, sy }) => (
              <rect
                key={id}
                className="kizkatt-resize-handle"
                data-group-handle="resize"
                data-handle="resize"
                data-resize-handle={id}
                style={{ cursor: getResizeCursor(0, id) }}
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
            ))
          )}
        </>
      )}
      <TransformCenterMarker center={center} mode={selectionTransformMode} />
      {showRotateHandle && !isSkewMode && (
        <>
          <circle
            className="kizkatt-rotate-handle"
            data-group-handle="rotate"
            data-handle="rotate"
            data-handle-world-x={rotateHandle.x}
            data-handle-world-y={rotateHandle.y}
            cx={rotateHandle.x}
            cy={rotateHandle.y}
            r={ROTATE_HANDLE_RADIUS}
          />
          {showRotateHoverIcon && !isRotating && (
            <RotateHoverIcon x={rotateHandle.x} y={rotateHandle.y} />
          )}
        </>
      )}
    </g>
  );
}
