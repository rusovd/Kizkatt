import { RESIZE_HANDLES } from "../../config/constants";
import { getResizeCursor, selectionBounds } from "../../geometry";
import type { Interaction, KizkattElement } from "../../model/types";

const HANDLE_SIZE = 8.5;
const HALF_HANDLE_SIZE = HANDLE_SIZE / 2;

export function SelectedBounds({
  elements,
  interaction
}: {
  elements: KizkattElement[];
  interaction: Interaction | null;
}) {
  const bounds = selectionBounds(elements, { includeRotation: true });

  if (!bounds || elements.length === 1) {
    return null;
  }
  const isRotating = interaction?.type === "rotate";
  const rotateHandle = {
    x: isRotating
      ? interaction.center.x +
        Math.cos(interaction.currentAngle) * interaction.handleRadius
      : bounds.x + bounds.width / 2,
    y: isRotating
      ? interaction.center.y +
        Math.sin(interaction.currentAngle) * interaction.handleRadius
      : bounds.y - 24
  };

  return (
    <g className="kizkatt-selection-overlay kizkatt-group-selection">
      {!isRotating && (
        <>
          <rect
            className="kizkatt-multi-selection"
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
              data-group-handle="resize"
              data-handle="resize"
              data-resize-handle={id}
              style={{ cursor: getResizeCursor(0, id) }}
              x={bounds.x + ((sx + 1) * bounds.width) / 2 - HALF_HANDLE_SIZE}
              y={bounds.y + ((sy + 1) * bounds.height) / 2 - HALF_HANDLE_SIZE}
              width={HANDLE_SIZE}
              height={HANDLE_SIZE}
            />
          ))}
        </>
      )}
      <circle
        className="kizkatt-rotate-handle"
        data-group-handle="rotate"
        data-handle="rotate"
        data-handle-world-x={rotateHandle.x}
        data-handle-world-y={rotateHandle.y}
        cx={rotateHandle.x}
        cy={rotateHandle.y}
        r={5}
      />
    </g>
  );
}
