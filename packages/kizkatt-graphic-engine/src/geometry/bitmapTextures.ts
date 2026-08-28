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
import { getElementBounds } from "./bounds";

const DEFAULT_TRANSPARENCY_TABLE_SAMPLE_COUNT = 32;

export type BitmapTextureSize = {
  height: number;
  width: number;
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
  };
};

export function createBitmapTextureFill({
  base,
  name,
  naturalSize,
  source,
  targetSize,
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
    ...getInitialBitmapTextureSize(naturalSize, targetSize),
    name,
    source,
    textureId
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
  targetSize: BitmapTextureSize
): BitmapTextureSize {
  return {
    height: Math.max(MIN_PIXEL_SIZE, naturalSize.height, targetSize.height),
    width: Math.max(MIN_PIXEL_SIZE, naturalSize.width, targetSize.width)
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
  const width = Math.max(MIN_PIXEL_SIZE, Math.abs(texture.width));
  const height = Math.max(MIN_PIXEL_SIZE, Math.abs(texture.height));
  const centerX = texture.transformWithObject
    ? bounds.x + bounds.width / 2 + texture.offsetX
    : width / 2 + texture.offsetX;
  const centerY = texture.transformWithObject
    ? bounds.y + bounds.height / 2 + texture.offsetY
    : height / 2 + texture.offsetY;

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
      skewX: texture.skew
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

  return {
    blendMode: texture.blendMode,
    blur: texture.edgeMatchEnabled
      ? Math.max(0, texture.edgeMatch) / PERCENT_MAX_VALUE
      : 0,
    brightness: texture.brightnessEnabled
      ? Math.max(0, PERCENT_MAX_VALUE + texture.brightness)
      : PERCENT_MAX_VALUE,
    contrast: texture.luminanceEnabled
      ? Math.max(0, PERCENT_MAX_VALUE + texture.luminance)
      : PERCENT_MAX_VALUE,
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
