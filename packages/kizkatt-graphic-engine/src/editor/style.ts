import type { StyleState } from "../model/types";

const IMAGE_BORDER_STYLE_KEYS: ReadonlyArray<keyof StyleState> = [
  "edgeStyle",
  "sloppiness",
  "sloppinessGap",
  "strokeColor",
  "strokeStyle",
  "strokeWidth"
];

export function hasOwnStyleProperty(
  patch: Partial<StyleState>,
  property: keyof StyleState
) {
  return Object.prototype.hasOwnProperty.call(patch, property);
}

export function changesImageBorderStyle(patch: Partial<StyleState>) {
  return IMAGE_BORDER_STYLE_KEYS.some((property) =>
    hasOwnStyleProperty(patch, property)
  );
}

export function isSameStyle(
  firstStyle: StyleState,
  secondStyle: StyleState
) {
  return (
    firstStyle.backgroundColor === secondStyle.backgroundColor &&
    firstStyle.edgeStyle === secondStyle.edgeStyle &&
    firstStyle.fillStyle === secondStyle.fillStyle &&
    firstStyle.fillWeight === secondStyle.fillWeight &&
    firstStyle.opacity === secondStyle.opacity &&
    firstStyle.sloppiness === secondStyle.sloppiness &&
    firstStyle.sloppinessGap === secondStyle.sloppinessGap &&
    firstStyle.strokeColor === secondStyle.strokeColor &&
    firstStyle.strokeStyle === secondStyle.strokeStyle &&
    firstStyle.strokeWidth === secondStyle.strokeWidth
  );
}
