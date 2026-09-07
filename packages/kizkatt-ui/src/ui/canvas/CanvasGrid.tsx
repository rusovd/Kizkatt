import {
  GRID_CROSS_CELL_RATIO,
  GRID_CROSS_MAX_SIZE,
  GRID_CROSS_MIN_SIZE,
  SVG_FULL_SIZE
} from "../../config/constants";
import { getGridWorldSizing } from "kizkatt-graphic-engine";
import type { GridSettings, Point } from "../../model/types";

const GRID_POINT_EPSILON = 0.0001;

function getPatternOffset(value: number, size: number) {
  return ((value % size) + size) % size;
}

function getMinorCrossPath(
  minorSize: number,
  majorSize: number,
  crossSize: number
) {
  const commands: string[] = [];

  for (
    let x = minorSize;
    x < majorSize - GRID_POINT_EPSILON;
    x += minorSize
  ) {
    for (
      let y = minorSize;
      y < majorSize - GRID_POINT_EPSILON;
      y += minorSize
    ) {
      commands.push(
        `M ${x - crossSize} ${y} H ${x + crossSize}`,
        `M ${x} ${y - crossSize} V ${y + crossSize}`
      );
    }
  }

  return commands.join(" ");
}

export function CanvasGrid({
  gridSettings,
  pan,
  visible,
  zoom
}: {
  gridSettings: GridSettings;
  pan: Point;
  visible: boolean;
  zoom: number;
}) {
  const gridSizing = getGridWorldSizing(gridSettings);
  const minorSize = gridSizing.minorSize * zoom;
  const majorSize = gridSizing.majorSize * zoom;
  const crossSize = Math.min(
    GRID_CROSS_MAX_SIZE,
    Math.max(GRID_CROSS_MIN_SIZE, minorSize * GRID_CROSS_CELL_RATIO)
  );
  const majorOffsetX = getPatternOffset(pan.x, majorSize);
  const majorOffsetY = getPatternOffset(pan.y, majorSize);
  const minorCrossPath = getMinorCrossPath(minorSize, majorSize, crossSize);

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
          {gridSettings.showMinor && (
            <rect
              className="kizkatt-grid kizkatt-grid-corners"
              width={SVG_FULL_SIZE}
              height={SVG_FULL_SIZE}
            />
          )}
          {gridSettings.showMajor && (
            <rect
              className="kizkatt-grid-major"
              width={SVG_FULL_SIZE}
              height={SVG_FULL_SIZE}
            />
          )}
        </>
      )}
    </>
  );
}
