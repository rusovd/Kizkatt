import type { StyleState } from "kizkatt-graphic-engine";

const IMAGE_BORDER_STYLE_KEYS: ReadonlyArray<keyof StyleState> = [
  "calligraphy",
  "calligraphyStretch",
  "edgeStyle",
  "sloppiness",
  "sloppinessGap",
  "scaleStrokeWithObject",
  "strokeColor",
  "strokeStyle",
  "strokeBehindFill",
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
    firstStyle.arrowheadScale === secondStyle.arrowheadScale &&
    firstStyle.backgroundColor === secondStyle.backgroundColor &&
    firstStyle.calligraphy === secondStyle.calligraphy &&
    firstStyle.calligraphyStretch === secondStyle.calligraphyStretch &&
    firstStyle.edgeStyle === secondStyle.edgeStyle &&
    firstStyle.endArrowhead === secondStyle.endArrowhead &&
    firstStyle.fillStyle === secondStyle.fillStyle &&
    firstStyle.fillWeight === secondStyle.fillWeight &&
    firstStyle.opacity === secondStyle.opacity &&
    firstStyle.sloppiness === secondStyle.sloppiness &&
    firstStyle.sloppinessGap === secondStyle.sloppinessGap &&
    firstStyle.scaleStrokeWithObject === secondStyle.scaleStrokeWithObject &&
    firstStyle.startArrowhead === secondStyle.startArrowhead &&
    firstStyle.strokeBehindFill === secondStyle.strokeBehindFill &&
    firstStyle.strokeColor === secondStyle.strokeColor &&
    firstStyle.strokeStyle === secondStyle.strokeStyle &&
    firstStyle.strokeWidth === secondStyle.strokeWidth
  );
}
