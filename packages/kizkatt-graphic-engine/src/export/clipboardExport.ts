import {
  EXPORT_CANVAS_IMAGE_ERROR_MESSAGE,
  EMPTY_COLLECTION_LENGTH,
  MIN_PIXEL_SIZE,
  PNG_EXPORT_DPI,
  PNG_IMAGE_MIME_TYPE,
  SCREEN_DPI,
  SVG_IMAGE_MIME_TYPE
} from "../config/constants";
import type { CopiedPngExport } from "../import/imageSizing";
import type { KizkattElement } from "../model/types";
import { getExportBounds } from "./exportBounds";
import type { SvgSerializeOptions } from "./svgExport";

type SerializeSvg = (
  svg: SVGSVGElement,
  options?: SvgSerializeOptions
) => string;

type ClipboardExportOptions = {
  elements: KizkattElement[];
  elementIds: string[];
  serializeSvg: SerializeSvg;
  svg: SVGSVGElement | null;
};

export async function copySelectionAsSvg({
  elements,
  elementIds,
  serializeSvg,
  svg
}: ClipboardExportOptions) {
  if (
    !svg ||
    elements.length === EMPTY_COLLECTION_LENGTH ||
    !navigator.clipboard?.writeText
  ) {
    return;
  }

  const bounds = getExportBounds(elements);

  if (!bounds) {
    return;
  }

  await navigator.clipboard.writeText(
    serializeSvg(svg, {
      bounds,
      elementIds,
      transparentBackground: true
    })
  );
}

export async function copySelectionAsPng({
  elements,
  elementIds,
  serializeSvg,
  svg
}: ClipboardExportOptions): Promise<CopiedPngExport | null> {
  if (
    !svg ||
    elements.length === EMPTY_COLLECTION_LENGTH ||
    !("ClipboardItem" in window) ||
    !navigator.clipboard?.write
  ) {
    return null;
  }

  const bounds = getExportBounds(elements);

  if (!bounds) {
    return null;
  }

  const pixelRatio = PNG_EXPORT_DPI / SCREEN_DPI;
  const markup = serializeSvg(svg, {
    bounds,
    elementIds,
    pixelRatio,
    scaleStrokes: true,
    transparentBackground: true
  });
  const blob = new Blob([markup], { type: SVG_IMAGE_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(EXPORT_CANVAS_IMAGE_ERROR_MESSAGE));
    image.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(
    MIN_PIXEL_SIZE,
    Math.ceil(bounds.width * pixelRatio)
  );
  canvas.height = Math.max(
    MIN_PIXEL_SIZE,
    Math.ceil(bounds.height * pixelRatio)
  );
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);

  const pngBlob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, PNG_IMAGE_MIME_TYPE)
  );

  if (!pngBlob) {
    return null;
  }

  await navigator.clipboard.write([
    new ClipboardItem({ [PNG_IMAGE_MIME_TYPE]: pngBlob })
  ]);

  return {
    createdAt: Date.now(),
    height: bounds.height,
    width: bounds.width
  };
}
