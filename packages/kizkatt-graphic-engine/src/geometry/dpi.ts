import { DEFAULT_DPI, SCREEN_DPI } from "../config/constants";

function getSafeDpi(dpi: number) {
  return Number.isFinite(dpi) && dpi > 0 ? dpi : DEFAULT_DPI;
}

export function getDpiPixelRatio(dpi: number = DEFAULT_DPI) {
  return getSafeDpi(dpi) / SCREEN_DPI;
}
