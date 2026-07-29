import type { Point } from "../../model/types";

const GRID_CELL_SIZE = 24;
const GRID_MAJOR_CELLS = 5;

function getPatternOffset(value: number, size: number) {
  return ((value % size) + size) % size;
}

function getMinorCrossPath(cellSize: number, crossSize: number) {
  const commands: string[] = [];

  for (let column = 1; column < GRID_MAJOR_CELLS; column += 1) {
    for (let row = 1; row < GRID_MAJOR_CELLS; row += 1) {
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
  const crossSize = Math.min(3, Math.max(1.25, cellSize * 0.11));
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
            width="100%"
            height="100%"
          />
          <rect className="kizkatt-grid-major" width="100%" height="100%" />
        </>
      )}
    </>
  );
}
