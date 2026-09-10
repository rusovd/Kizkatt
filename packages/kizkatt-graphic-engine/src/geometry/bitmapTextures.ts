import {
  DEFAULT_BITMAP_TEXTURE_FILL,
  MIN_PIXEL_SIZE,
  PERCENT_MAX_VALUE
} from "../config/constants";
import type {
  BitmapTextureFill,
  KizkattElement,
  Point
} from "../model/types";
import { getElementBounds, getElementTransformedBounds } from "./bounds";

const DEFAULT_TRANSPARENCY_TABLE_SAMPLE_COUNT = 32;
const DEGREES_PER_RADIAN = 180 / Math.PI;
const TEXTURE_BOUNDS_EPSILON = 0.000001;
const TEXTURE_CONSTRAINT_ITERATIONS = 24;

export type BitmapTextureSize = {
  height: number;
  width: number;
};

export type BitmapTextureTargetTransform = {
  rotation: number;
  skew: number;
  skewY: number;
};

const DEFAULT_BITMAP_TEXTURE_TARGET_TRANSFORM: BitmapTextureTargetTransform = {
  rotation: 0,
  skew: 0,
  skewY: 0
};

export type BitmapTexturePlacement = {
  bounds: {
    height: number;
    width: number;
    x: number;
    y: number;
  };
  image: {
    height: number;
    width: number;
    x: number;
    y: number;
  };
  transform: {
    centerX: number;
    centerY: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    skewX: number;
    skewY: number;
  };
};

export type BitmapTexturePreviewGeometry = {
  crop: {
    centerX: number;
    centerY: number;
    height: number;
    rotation: number;
    skew: number;
    skewY: number;
    width: number;
  };
  tileAvailable: boolean;
};

export function getBitmapTextureTargetTransform(
  element?: KizkattElement | null
): BitmapTextureTargetTransform {
  if (!element) {
    return { ...DEFAULT_BITMAP_TEXTURE_TARGET_TRANSFORM };
  }

  return {
    rotation: element.angle * DEGREES_PER_RADIAN,
    skew: (element.skewX ?? 0) * DEGREES_PER_RADIAN,
    skewY: (element.skewY ?? 0) * DEGREES_PER_RADIAN
  };
}

function isElementInsideTexture(
  element: KizkattElement,
  sourceSize: BitmapTextureSize
) {
  const bounds = getElementTransformedBounds(element);

  return (
    bounds.x >= -TEXTURE_BOUNDS_EPSILON &&
    bounds.y >= -TEXTURE_BOUNDS_EPSILON &&
    bounds.x + bounds.width <= sourceSize.width + TEXTURE_BOUNDS_EPSILON &&
    bounds.y + bounds.height <= sourceSize.height + TEXTURE_BOUNDS_EPSILON
  );
}

function translateElementInsideTexture(
  element: KizkattElement,
  sourceSize: BitmapTextureSize
) {
  const bounds = getElementTransformedBounds(element);
  let deltaX = 0;
  let deltaY = 0;

  if (bounds.x < 0) {
    deltaX = -bounds.x;
  } else if (bounds.x + bounds.width > sourceSize.width) {
    deltaX = sourceSize.width - bounds.x - bounds.width;
  }

  if (bounds.y < 0) {
    deltaY = -bounds.y;
  } else if (bounds.y + bounds.height > sourceSize.height) {
    deltaY = sourceSize.height - bounds.y - bounds.height;
  }

  return {
    ...element,
    x: element.x + deltaX,
    y: element.y + deltaY
  };
}

function fitElementInsideTexture(
  element: KizkattElement,
  sourceSize: BitmapTextureSize
) {
  let nextElement = element;

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const bounds = getElementTransformedBounds(nextElement);
    const scale = Math.min(
      1,
      sourceSize.width / Math.max(MIN_PIXEL_SIZE, bounds.width),
      sourceSize.height / Math.max(MIN_PIXEL_SIZE, bounds.height)
    );

    if (scale < 1) {
      const centerX = nextElement.x + nextElement.width / 2;
      const centerY = nextElement.y + nextElement.height / 2;
      const width = Math.max(MIN_PIXEL_SIZE, nextElement.width * scale);
      const height = Math.max(MIN_PIXEL_SIZE, nextElement.height * scale);
      nextElement = {
        ...nextElement,
        height,
        width,
        x: centerX - width / 2,
        y: centerY - height / 2
      };
    }

    nextElement = translateElementInsideTexture(nextElement, sourceSize);
  }

  return nextElement;
}

function interpolateElement(
  from: KizkattElement,
  to: KizkattElement,
  progress: number
) {
  const interpolate = (start: number, end: number) =>
    start + (end - start) * progress;

  return {
    ...to,
    angle: interpolate(from.angle, to.angle),
    height: interpolate(from.height, to.height),
    skewX: interpolate(from.skewX ?? 0, to.skewX ?? 0),
    skewY: interpolate(from.skewY ?? 0, to.skewY ?? 0),
    width: interpolate(from.width, to.width),
    x: interpolate(from.x, to.x),
    y: interpolate(from.y, to.y)
  };
}

export function constrainBitmapTextureCropElement(
  originalElement: KizkattElement,
  candidateElement: KizkattElement,
  sourceSize: BitmapTextureSize,
  translateCandidate = false
) {
  if (isElementInsideTexture(candidateElement, sourceSize)) {
    return candidateElement;
  }

  const candidateBounds = getElementTransformedBounds(candidateElement);
  if (
    translateCandidate &&
    candidateBounds.width <= sourceSize.width &&
    candidateBounds.height <= sourceSize.height
  ) {
    return translateElementInsideTexture(candidateElement, sourceSize);
  }

  const safeOriginal = isElementInsideTexture(originalElement, sourceSize)
    ? originalElement
    : fitElementInsideTexture(originalElement, sourceSize);
  let minimum = 0;
  let maximum = 1;
  let constrainedElement = safeOriginal;

  for (
    let iteration = 0;
    iteration < TEXTURE_CONSTRAINT_ITERATIONS;
    iteration += 1
  ) {
    const progress = (minimum + maximum) / 2;
    const interpolatedElement = interpolateElement(
      safeOriginal,
      candidateElement,
      progress
    );

    if (isElementInsideTexture(interpolatedElement, sourceSize)) {
      constrainedElement = interpolatedElement;
      minimum = progress;
    } else {
      maximum = progress;
    }
  }

  return constrainedElement;
}

export function getBitmapTexturePreviewGeometry(
  texture: BitmapTextureFill,
  sourceSize: BitmapTextureSize,
  targetSize: BitmapTextureSize,
  targetTransform: BitmapTextureTargetTransform =
    DEFAULT_BITMAP_TEXTURE_TARGET_TRANSFORM
): BitmapTexturePreviewGeometry {
  const sourceWidth = Math.max(MIN_PIXEL_SIZE, sourceSize.width);
  const sourceHeight = Math.max(MIN_PIXEL_SIZE, sourceSize.height);
  const targetWidth = Math.max(MIN_PIXEL_SIZE, targetSize.width);
  const targetHeight = Math.max(MIN_PIXEL_SIZE, targetSize.height);
  const textureWidth = texture.fitToObject
    ? targetWidth
    : Math.max(MIN_PIXEL_SIZE, Math.abs(texture.width));
  const textureHeight = texture.fitToObject
    ? targetHeight
    : Math.max(MIN_PIXEL_SIZE, Math.abs(texture.height));

  return {
    crop: {
      centerX:
        sourceWidth / 2 - (texture.offsetX * sourceWidth) / textureWidth,
      centerY:
        sourceHeight / 2 - (texture.offsetY * sourceHeight) / textureHeight,
      height: (targetHeight * sourceHeight) / textureHeight,
      rotation: targetTransform.rotation - texture.rotation,
      skew: targetTransform.skew - texture.skew,
      skewY: targetTransform.skewY - texture.skewY,
      width: (targetWidth * sourceWidth) / textureWidth
    },
    tileAvailable:
      targetWidth > textureWidth || targetHeight > textureHeight
  };
}

export function moveBitmapTextureCrop(
  texture: BitmapTextureFill,
  sourceSize: BitmapTextureSize,
  sourceDelta: Point
): Pick<BitmapTextureFill, "offsetX" | "offsetY"> {
  const sourceWidth = Math.max(MIN_PIXEL_SIZE, sourceSize.width);
  const sourceHeight = Math.max(MIN_PIXEL_SIZE, sourceSize.height);

  return {
    offsetX: texture.offsetX - (sourceDelta.x * texture.width) / sourceWidth,
    offsetY: texture.offsetY - (sourceDelta.y * texture.height) / sourceHeight
  };
}

export function scaleBitmapTextureCrop(
  texture: BitmapTextureFill,
  scale: number,
  min = MIN_PIXEL_SIZE,
  max = Number.POSITIVE_INFINITY
): Pick<BitmapTextureFill, "height" | "offsetX" | "offsetY" | "width"> {
  const safeScale = Math.max(MIN_PIXEL_SIZE, scale);
  const nextWidth = Math.min(
    max,
    Math.max(min, texture.width / safeScale)
  );
  const nextHeight = Math.min(
    max,
    Math.max(min, texture.height / safeScale)
  );

  return {
    height: nextHeight,
    offsetX: texture.offsetX * (nextWidth / texture.width),
    offsetY: texture.offsetY * (nextHeight / texture.height),
    width: nextWidth
  };
}

export function getBitmapTextureTransformFromPreviewCrop(
  sourceSize: BitmapTextureSize,
  targetSize: BitmapTextureSize,
  crop: BitmapTexturePreviewGeometry["crop"],
  targetTransform: BitmapTextureTargetTransform =
    DEFAULT_BITMAP_TEXTURE_TARGET_TRANSFORM
): Pick<
  BitmapTextureFill,
  | "fitToObject"
  | "height"
  | "offsetX"
  | "offsetY"
  | "rotation"
  | "skew"
  | "skewY"
  | "width"
> {
  const sourceWidth = Math.max(MIN_PIXEL_SIZE, sourceSize.width);
  const sourceHeight = Math.max(MIN_PIXEL_SIZE, sourceSize.height);
  const targetWidth = Math.max(MIN_PIXEL_SIZE, targetSize.width);
  const targetHeight = Math.max(MIN_PIXEL_SIZE, targetSize.height);
  const cropWidth = Math.max(MIN_PIXEL_SIZE, Math.abs(crop.width));
  const cropHeight = Math.max(MIN_PIXEL_SIZE, Math.abs(crop.height));
  const width = (targetWidth * sourceWidth) / cropWidth;
  const height = (targetHeight * sourceHeight) / cropHeight;

  return {
    fitToObject: false,
    height,
    offsetX: ((sourceWidth / 2 - crop.centerX) * width) / sourceWidth,
    offsetY: ((sourceHeight / 2 - crop.centerY) * height) / sourceHeight,
    rotation: targetTransform.rotation - crop.rotation,
    skew: targetTransform.skew - crop.skew,
    skewY: targetTransform.skewY - crop.skewY,
    width
  };
}

export function createBitmapTextureFill({
  base,
  name,
  naturalSize,
  source,
  textureId
}: {
  base?: Partial<BitmapTextureFill>;
  name: string;
  naturalSize: BitmapTextureSize;
  source?: string;
  targetSize: BitmapTextureSize;
  textureId: string;
}): BitmapTextureFill {
  return {
    ...DEFAULT_BITMAP_TEXTURE_FILL,
    ...base,
    ...getResetBitmapTextureTransform(naturalSize),
    name,
    source,
    textureId
  };
}

export function createEmbeddedBitmapTextureFill({
  name,
  source,
  targetSize,
  textureId
}: {
  name: string;
  source: string;
  targetSize: BitmapTextureSize;
  textureId: string;
}): BitmapTextureFill {
  return {
    ...DEFAULT_BITMAP_TEXTURE_FILL,
    ...getResetBitmapTextureTransform(targetSize),
    desaturateEnabled: false,
    fitToObject: true,
    name,
    source,
    textureId,
    transparencyEnabled: false
  };
}

export function getResizedBitmapTextureSize(
  currentSize: BitmapTextureSize,
  dimension: "height" | "width",
  value: number,
  {
    locked = false,
    max = Number.POSITIVE_INFINITY,
    min = MIN_PIXEL_SIZE
  }: { locked?: boolean; max?: number; min?: number } = {}
): BitmapTextureSize {
  const nextValue = Math.min(max, Math.max(min, value));

  if (!locked) {
    return { ...currentSize, [dimension]: nextValue };
  }

  const otherDimension = dimension === "width" ? "height" : "width";
  const currentValue = currentSize[dimension];
  const ratio = currentValue === 0 ? 1 : nextValue / currentValue;

  return {
    ...currentSize,
    [dimension]: nextValue,
    [otherDimension]: Math.min(
      max,
      Math.max(min, currentSize[otherDimension] * ratio)
    )
  };
}

export function getCoveredBitmapSourcePoint(
  sourceSize: BitmapTextureSize,
  viewportSize: BitmapTextureSize,
  viewportPoint: Point
): Point {
  const sourceWidth = Math.max(MIN_PIXEL_SIZE, sourceSize.width);
  const sourceHeight = Math.max(MIN_PIXEL_SIZE, sourceSize.height);
  const viewportWidth = Math.max(MIN_PIXEL_SIZE, viewportSize.width);
  const viewportHeight = Math.max(MIN_PIXEL_SIZE, viewportSize.height);
  const scale = Math.max(
    viewportWidth / sourceWidth,
    viewportHeight / sourceHeight
  );
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;

  return {
    x: Math.min(
      sourceWidth - 1,
      Math.max(
        0,
        (viewportPoint.x - (viewportWidth - renderedWidth) / 2) / scale
      )
    ),
    y: Math.min(
      sourceHeight - 1,
      Math.max(
        0,
        (viewportPoint.y - (viewportHeight - renderedHeight) / 2) / scale
      )
    )
  };
}

export function getInitialBitmapTextureSize(
  naturalSize: BitmapTextureSize,
  _targetSize?: BitmapTextureSize
): BitmapTextureSize {
  return {
    height: Math.max(MIN_PIXEL_SIZE, naturalSize.height),
    width: Math.max(MIN_PIXEL_SIZE, naturalSize.width)
  };
}

export function getResetBitmapTextureTransform(
  sourceSize: BitmapTextureSize
) {
  return {
    fitToObject: DEFAULT_BITMAP_TEXTURE_FILL.fitToObject,
    height: Math.max(MIN_PIXEL_SIZE, sourceSize.height),
    mirrorX: DEFAULT_BITMAP_TEXTURE_FILL.mirrorX,
    mirrorY: DEFAULT_BITMAP_TEXTURE_FILL.mirrorY,
    offset: DEFAULT_BITMAP_TEXTURE_FILL.offset,
    offsetMode: DEFAULT_BITMAP_TEXTURE_FILL.offsetMode,
    offsetX: DEFAULT_BITMAP_TEXTURE_FILL.offsetX,
    offsetY: DEFAULT_BITMAP_TEXTURE_FILL.offsetY,
    rotation: DEFAULT_BITMAP_TEXTURE_FILL.rotation,
    scaleLocked: DEFAULT_BITMAP_TEXTURE_FILL.scaleLocked,
    skew: DEFAULT_BITMAP_TEXTURE_FILL.skew,
    skewY: DEFAULT_BITMAP_TEXTURE_FILL.skewY,
    tile: DEFAULT_BITMAP_TEXTURE_FILL.tile,
    transformWithObject: DEFAULT_BITMAP_TEXTURE_FILL.transformWithObject,
    width: Math.max(MIN_PIXEL_SIZE, sourceSize.width)
  };
}

export function getBitmapTexturePlacement(
  element: KizkattElement,
  texture: BitmapTextureFill
): BitmapTexturePlacement {
  const elementBounds = getElementBounds(element);
  const bounds = {
    height: Math.max(MIN_PIXEL_SIZE, Math.abs(elementBounds.height)),
    width: Math.max(MIN_PIXEL_SIZE, Math.abs(elementBounds.width)),
    x: elementBounds.x,
    y: elementBounds.y
  };
  const width = texture.fitToObject
    ? bounds.width
    : Math.max(MIN_PIXEL_SIZE, Math.abs(texture.width));
  const height = texture.fitToObject
    ? bounds.height
    : Math.max(MIN_PIXEL_SIZE, Math.abs(texture.height));
  const centerX = bounds.x + bounds.width / 2 + texture.offsetX;
  const centerY = bounds.y + bounds.height / 2 + texture.offsetY;

  return {
    bounds,
    image: {
      height,
      width,
      x: -width / 2,
      y: -height / 2
    },
    transform: {
      centerX,
      centerY,
      rotation: texture.rotation,
      scaleX: texture.mirrorX ? -1 : 1,
      scaleY: texture.mirrorY ? -1 : 1,
      skewX: texture.skew,
      skewY: texture.skewY
    }
  };
}

export function getBitmapTextureAdjustments(texture: BitmapTextureFill) {
  const saturation = texture.colorEnabled
    ? Math.max(0, PERCENT_MAX_VALUE + texture.color)
    : PERCENT_MAX_VALUE;
  const desaturate = texture.desaturateEnabled
    ? Math.max(0, Math.min(PERCENT_MAX_VALUE, texture.desaturate))
    : 0;
  const legacyMultiplyAmount =
    texture.blendMode === "multiply" ? texture.blendAmount : 0;
  const multiplyAmount = Number.isFinite(texture.multiplyAmount)
    ? texture.multiplyAmount
    : legacyMultiplyAmount;
  const destinationOutAmount = Number.isFinite(texture.destinationOutAmount)
    ? texture.destinationOutAmount
    : 0;

  return {
    blendMode: multiplyAmount > 0 ? "multiply" : "normal",
    blur: texture.edgeMatchEnabled
      ? Math.max(0, texture.edgeMatch) / PERCENT_MAX_VALUE
      : 0,
    brightness: texture.brightnessEnabled
      ? Math.max(0, PERCENT_MAX_VALUE + texture.brightness)
      : PERCENT_MAX_VALUE,
    contrast: texture.luminanceEnabled
      ? Math.max(0, PERCENT_MAX_VALUE + texture.luminance)
      : PERCENT_MAX_VALUE,
    destinationOut: Math.max(
      0,
      Math.min(PERCENT_MAX_VALUE, destinationOutAmount)
    ) / PERCENT_MAX_VALUE,
    multiply: Math.max(0, Math.min(PERCENT_MAX_VALUE, multiplyAmount)) /
      PERCENT_MAX_VALUE,
    opacity: texture.blendAmount / PERCENT_MAX_VALUE,
    saturation: saturation * (1 - desaturate / PERCENT_MAX_VALUE)
  };
}

export function getBitmapTextureRgbChannels(color: string) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);

  return match
    ? [
        Number.parseInt(match[1], 16),
        Number.parseInt(match[2], 16),
        Number.parseInt(match[3], 16)
      ]
    : [255, 255, 255];
}

export function getBitmapTextureTransparencyTable(
  channel: number,
  tolerance: number,
  sampleCount = DEFAULT_TRANSPARENCY_TABLE_SAMPLE_COUNT
) {
  const normalizedTolerance =
    Math.max(0, Math.min(PERCENT_MAX_VALUE, tolerance)) / PERCENT_MAX_VALUE;
  const normalizedSampleCount = Math.max(2, Math.floor(sampleCount));

  return Array.from({ length: normalizedSampleCount }, (_, index) => {
    const sample = (index / (normalizedSampleCount - 1)) * 255;
    const distance = Math.abs(sample - channel) / 255;
    const alpha =
      normalizedTolerance === 0
        ? distance < 1 / 255
          ? 0
          : 1
        : Math.min(1, distance / normalizedTolerance);

    return Number(alpha.toFixed(4));
  }).join(" ");
}
