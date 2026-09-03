import {
  TRANSPARENT_COLOR,
  type StyleState
} from "kizkatt-graphic-engine";

const IMAGE_BORDER_STYLE_KEYS: ReadonlyArray<keyof StyleState> = [
  "calligraphy",
  "calligraphyStretch",
  "edgeStyle",
  "sloppiness",
  "sloppinessGap",
  "scaleStrokeWithObject",
  "strokeColor",
  "strokeLineCount",
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

export function getExclusiveFillStylePatch(
  patch: Partial<StyleState>
): Partial<StyleState> {
  const nextPatch = { ...patch };

  if (patch.gradientFill) {
    nextPatch.backgroundColor = TRANSPARENT_COLOR;
    nextPatch.bitmapTexture = undefined;
    nextPatch.fillStyle = "gradient";
    return nextPatch;
  }

  if (patch.bitmapTexture) {
    nextPatch.backgroundColor = TRANSPARENT_COLOR;
    nextPatch.gradientFill = undefined;
    nextPatch.fillStyle = "monochromeTexture";
    return nextPatch;
  }

  if (hasOwnStyleProperty(patch, "backgroundColor")) {
    nextPatch.bitmapTexture = undefined;
    nextPatch.gradientFill = undefined;
    nextPatch.fillStyle = "solid";
  } else if (
    hasOwnStyleProperty(patch, "fillStyle") &&
    patch.fillStyle !== "monochromeTexture"
  ) {
    nextPatch.bitmapTexture = undefined;
  }

  if (
    hasOwnStyleProperty(patch, "fillStyle") &&
    patch.fillStyle !== "gradient"
  ) {
    nextPatch.gradientFill = undefined;
  }

  return nextPatch;
}

export function applyStylePatch<T extends StyleState>(
  style: T,
  patch: Partial<StyleState>
): T {
  const nextStyle = { ...style, ...patch };

  if (
    hasOwnStyleProperty(patch, "bitmapTexture") &&
    patch.bitmapTexture === undefined
  ) {
    delete nextStyle.bitmapTexture;
  }

  if (
    hasOwnStyleProperty(patch, "gradientFill") &&
    patch.gradientFill === undefined
  ) {
    delete nextStyle.gradientFill;
  }

  return nextStyle;
}

export function isSameStyle(
  firstStyle: StyleState,
  secondStyle: StyleState
) {
  return (
    firstStyle.arrowheadScale === secondStyle.arrowheadScale &&
    firstStyle.backgroundColor === secondStyle.backgroundColor &&
    firstStyle.bitmapTexture === secondStyle.bitmapTexture &&
    firstStyle.calligraphy === secondStyle.calligraphy &&
    firstStyle.calligraphyStretch === secondStyle.calligraphyStretch &&
    firstStyle.edgeStyle === secondStyle.edgeStyle &&
    firstStyle.endArrowhead === secondStyle.endArrowhead &&
    firstStyle.fillStyle === secondStyle.fillStyle &&
    firstStyle.gradientFill === secondStyle.gradientFill &&
    firstStyle.fillWeight === secondStyle.fillWeight &&
    firstStyle.opacity === secondStyle.opacity &&
    firstStyle.sloppiness === secondStyle.sloppiness &&
    firstStyle.sloppinessGap === secondStyle.sloppinessGap &&
    firstStyle.scaleStrokeWithObject === secondStyle.scaleStrokeWithObject &&
    firstStyle.startArrowhead === secondStyle.startArrowhead &&
    firstStyle.strokeBehindFill === secondStyle.strokeBehindFill &&
    firstStyle.strokeColor === secondStyle.strokeColor &&
    firstStyle.strokeLineCount === secondStyle.strokeLineCount &&
    firstStyle.strokeStyle === secondStyle.strokeStyle &&
    firstStyle.strokeWidth === secondStyle.strokeWidth
  );
}
