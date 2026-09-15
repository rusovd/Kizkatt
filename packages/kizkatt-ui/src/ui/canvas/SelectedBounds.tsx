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

function getScreenScale(zoom = 1) {
  return 1 / Math.max(zoom, Number.EPSILON);
}

export function SelectedBounds({
  elements,
  interaction,
  selectionTransformCenter = null,
  selectionTransformMode = "resize",
  showRotateHandle = true,
  showRotateHoverIcon = true,
  zoom = 1
}: {
  elements: KizkattElement[];
  interaction: Interaction | null;
  selectionTransformCenter?: Point | null;
  selectionTransformMode?: SelectionTransformMode;
  showRotateHandle?: boolean;
  showRotateHoverIcon?: boolean;
  zoom?: number;
}) {
  const bounds = selectionBounds(elements, { includeRotation: true });

  if (!bounds || elements.length === SINGLE_SELECTION_COUNT) {
    return null;
  }
  const isRotating = interaction?.type === "rotate";
  const isSkewing = interaction?.type === "skew";
  const isSkewMode = selectionTransformMode === "skew";
  const screenScale = getScreenScale(zoom);
  const handleSize = SELECTION_HANDLE_SIZE * screenScale;
  const halfHandleSize = handleSize / HALF_DIVISOR;
  const rotateHandleOffset = ROTATE_HANDLE_OFFSET * screenScale;
  const rotateHandleRadius = ROTATE_HANDLE_RADIUS * screenScale;
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
      : bounds.y - rotateHandleOffset
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
            <SkewOverlayHandles bounds={bounds} zoom={zoom} />
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
            ))
          )}
        </>
      )}
      <TransformCenterMarker
        center={center}
        interactive={isSkewMode}
        mode={selectionTransformMode}
        scale={screenScale}
      />
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
            r={rotateHandleRadius}
          />
          {showRotateHoverIcon && !isRotating && (
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
