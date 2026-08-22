import {
  DEFAULT_DPI,
  DEFAULT_IMAGE_SIZE,
  MAX_PASTED_IMAGE_SIZE,
  MIN_PIXEL_SIZE
} from "../config/constants";
import { getDpiPixelRatio } from "../geometry/dpi";

export type Size = {
  height: number;
  width: number;
};

export type CopiedPngExport = Size & {
  createdAt: number;
  dpi: number;
};

export const COPIED_PNG_EXPORT_SIZE_TTL_MS = 5 * 60 * 1000;

export function getFittedImageSize(width: number, height: number): Size {
  if (width <= 0 || height <= 0) {
    return DEFAULT_IMAGE_SIZE;
  }

  const scale = Math.min(
    1,
    MAX_PASTED_IMAGE_SIZE.width / width,
    MAX_PASTED_IMAGE_SIZE.height / height
  );

  return {
    height: Math.max(MIN_PIXEL_SIZE, Math.round(height * scale)),
    width: Math.max(MIN_PIXEL_SIZE, Math.round(width * scale))
  };
}

export function getImageSize(width: number, height: number): Size {
  return {
    height: Math.max(MIN_PIXEL_SIZE, Math.round(height)),
    width: Math.max(MIN_PIXEL_SIZE, Math.round(width))
  };
}

export function isExpectedCopiedPngSize(
  naturalWidth: number,
  naturalHeight: number,
  preferredSize: Size,
  dpi: number = DEFAULT_DPI
) {
  const pixelRatio = getDpiPixelRatio(dpi);
  const expectedWidth = Math.ceil(preferredSize.width * pixelRatio);
  const expectedHeight = Math.ceil(preferredSize.height * pixelRatio);

  return (
    Math.abs(naturalWidth - expectedWidth) <= MIN_PIXEL_SIZE &&
    Math.abs(naturalHeight - expectedHeight) <= MIN_PIXEL_SIZE
  );
}
