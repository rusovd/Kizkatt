import {
  DEFAULT_MM_GRID_SETTINGS,
  DEFAULT_GRID_SETTINGS,
  SCREEN_DPI
} from "../config/constants";
import type { GridSettings, GridUnit } from "../model/types";

const MILLIMETERS_PER_INCH = 25.4;
const MAX_GRID_SUBDIVISIONS = 200;

export type GridWorldSizing = {
  majorSize: number;
  minorSize: number;
};

export function getDefaultGridSettings(unit: GridUnit): GridSettings {
  return {
    ...(unit === "mm" ? DEFAULT_MM_GRID_SETTINGS : DEFAULT_GRID_SETTINGS)
  };
}

function getGridMetricScale(settings: GridSettings) {
  return Number.isFinite(settings.metricScale) ? settings.metricScale : 1;
}

function millimetersToWorldUnits(value: number, metricScale = 1) {
  return (value / MILLIMETERS_PER_INCH) * SCREEN_DPI * metricScale;
}

export function getCalibratedMillimetersWorldSize(
  millimeters: number,
  settings: GridSettings
) {
  return millimetersToWorldUnits(millimeters, getGridMetricScale(settings));
}

export function getGridWorldSizing(settings: GridSettings): GridWorldSizing {
  const metricScale = getGridMetricScale(settings);
  const majorSize =
    settings.unit === "mm"
      ? millimetersToWorldUnits(settings.majorSize, metricScale)
      : settings.majorSize;
  const minorSize =
    settings.unit === "mm"
      ? millimetersToWorldUnits(settings.minorSize, metricScale)
      : settings.minorSize;
  const safeMajorSize = Math.max(Number.EPSILON, majorSize);
  const minimumMinorSize = safeMajorSize / MAX_GRID_SUBDIVISIONS;

  return {
    majorSize: safeMajorSize,
    minorSize: Math.min(
      safeMajorSize,
      Math.max(Number.EPSILON, minimumMinorSize, minorSize)
    )
  };
}
