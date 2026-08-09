import {
  DEFAULT_CM_GRID_SETTINGS,
  DEFAULT_GRID_SETTINGS,
  SCREEN_DPI
} from "../config/constants";
import type { GridSettings, GridUnit } from "../model/types";

const CENTIMETERS_PER_INCH = 2.54;
const MILLIMETERS_PER_CENTIMETER = 10;
const MAX_GRID_SUBDIVISIONS = 200;

export type GridWorldSizing = {
  majorSize: number;
  minorSize: number;
};

export function getDefaultGridSettings(unit: GridUnit): GridSettings {
  return {
    ...(unit === "cm" ? DEFAULT_CM_GRID_SETTINGS : DEFAULT_GRID_SETTINGS)
  };
}

function getGridCmScale(settings: GridSettings) {
  return Number.isFinite(settings.cmScale) ? settings.cmScale : 1;
}

function centimetersToWorldUnits(value: number, cmScale = 1) {
  return (value / CENTIMETERS_PER_INCH) * SCREEN_DPI * cmScale;
}

function millimetersToWorldUnits(value: number, cmScale = 1) {
  return centimetersToWorldUnits(
    value / MILLIMETERS_PER_CENTIMETER,
    cmScale
  );
}

export function getCalibratedCentimetersWorldSize(
  centimeters: number,
  settings: GridSettings
) {
  return centimetersToWorldUnits(centimeters, getGridCmScale(settings));
}

export function getGridWorldSizing(settings: GridSettings): GridWorldSizing {
  const cmScale = getGridCmScale(settings);
  const majorSize =
    settings.unit === "cm"
      ? centimetersToWorldUnits(settings.majorSize, cmScale)
      : settings.majorSize;
  const minorSize =
    settings.unit === "cm"
      ? millimetersToWorldUnits(settings.minorSize, cmScale)
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
