import { RESIZE_HANDLES } from "../../config/constants";
import { getResizeCursor, selectionBounds } from "../../geometry";
import type { KizkattElement } from "../../model/types";

export function SelectedBounds({ elements }: { elements: KizkattElement[] }) {
  const bounds = selectionBounds(elements);

  if (!bounds || elements.length === 1) {
    return null;
  }
  const rotateHandle = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y - 24
  };

  return (
    <g className="kizkatt-selection-overlay kizkatt-group-selection">
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
          x={bounds.x + (sx === 1 ? bounds.width : 0) - 5}
          y={bounds.y + (sy === 1 ? bounds.height : 0) - 5}
          width={10}
          height={10}
        />
      ))}
      <circle
        className="kizkatt-rotate-handle"
        data-group-handle="rotate"
        data-handle="rotate"
        cx={rotateHandle.x}
        cy={rotateHandle.y}
        r={5}
      />
    </g>
  );
}
