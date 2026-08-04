import {
  GRID_CELL_SIZE,
  GRID_CROSS_CELL_RATIO,
  GRID_CROSS_MAX_SIZE,
  GRID_CROSS_MIN_SIZE,
  GRID_FIRST_MINOR_INDEX,
  GRID_MAJOR_CELLS,
  SVG_FULL_SIZE
} from "../../config/constants";
import type { Point } from "../../model/types";

function getPatternOffset(value: number, size: number) {
  return ((value % size) + size) % size;
}

function getMinorCrossPath(cellSize: number, crossSize: number) {
  const commands: string[] = [];

  for (
    let column = GRID_FIRST_MINOR_INDEX;
    column < GRID_MAJOR_CELLS;
    column += GRID_FIRST_MINOR_INDEX
  ) {
    for (
      let row = GRID_FIRST_MINOR_INDEX;
      row < GRID_MAJOR_CELLS;
      row += GRID_FIRST_MINOR_INDEX
    ) {
      const x = column * cellSize;
      const y = row * cellSize;

      commands.push(
        `M ${x - crossSize} ${y} H ${x + crossSize}`,
        `M ${x} ${y - crossSize} V ${y + crossSize}`
      );
    }
  }

  return commands.join(" ");
}

export function CanvasGrid({
  pan,
  visible,
  zoom
}: {
  pan: Point;
  visible: boolean;
  zoom: number;
}) {
  const cellSize = GRID_CELL_SIZE * zoom;
  const majorSize = cellSize * GRID_MAJOR_CELLS;
  const crossSize = Math.min(
    GRID_CROSS_MAX_SIZE,
    Math.max(GRID_CROSS_MIN_SIZE, cellSize * GRID_CROSS_CELL_RATIO)
  );
  const majorOffsetX = getPatternOffset(pan.x, majorSize);
  const majorOffsetY = getPatternOffset(pan.y, majorSize);
  const minorCrossPath = getMinorCrossPath(cellSize, crossSize);

  return (
    <>
      <defs>
        <pattern
          id="kizkatt-grid-minor"
          width={majorSize}
          height={majorSize}
          patternUnits="userSpaceOnUse"
          x={majorOffsetX}
          y={majorOffsetY}
        >
          <path className="kizkatt-grid-corner-line" d={minorCrossPath} />
        </pattern>
        <pattern
          id="kizkatt-grid-major"
          width={majorSize}
          height={majorSize}
          patternUnits="userSpaceOnUse"
          x={majorOffsetX}
          y={majorOffsetY}
        >
          <path
            className="kizkatt-grid-major-line"
            d={`M 0 0 H ${majorSize} M 0 0 V ${majorSize}`}
          />
        </pattern>
      </defs>
      {visible && (
        <>
          <rect
            className="kizkatt-grid kizkatt-grid-corners"
            width={SVG_FULL_SIZE}
            height={SVG_FULL_SIZE}
          />
          <rect
            className="kizkatt-grid-major"
            width={SVG_FULL_SIZE}
            height={SVG_FULL_SIZE}
          />
        </>
      )}
    </>
  );
}
