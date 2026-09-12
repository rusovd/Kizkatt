import {
  DEFAULT_DPI,
  embedBitmapTextureFragmentsInSvg,
  EXPORT_CANVAS_IMAGE_ERROR_MESSAGE,
  EMPTY_COLLECTION_LENGTH,
  getDpiPixelRatio,
  MIN_PIXEL_SIZE,
  PNG_IMAGE_MIME_TYPE,
  serializeSvg,
  SVG_IMAGE_MIME_TYPE
} from "kizkatt-graphic-engine";
import type { CopiedPngExport } from "kizkatt-graphic-engine";
import type { KizkattElement } from "kizkatt-graphic-engine";
import { getExportBounds } from "kizkatt-graphic-engine";
type ClipboardExportOptions = {
  dpi?: number;
  elements: KizkattElement[];
  elementIds: string[];
  svg: SVGSVGElement | null;
};

export async function copySelectionAsSvg({
  dpi = DEFAULT_DPI,
  elements,
  elementIds,
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

  const markup = serializeSvg(svg, {
    bounds,
    elementIds,
    transparentBackground: true
  });
  const embeddedMarkup = await embedBitmapTextureFragmentsInSvg(
    markup,
    elements,
    { pixelRatio: getDpiPixelRatio(dpi) }
  );

  await navigator.clipboard.writeText(embeddedMarkup);
}

export async function copySelectionAsPng({
  dpi = DEFAULT_DPI,
  elements,
  elementIds,
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

  const pixelRatio = getDpiPixelRatio(dpi);
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
  let canvas: HTMLCanvasElement | null = null;

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error(EXPORT_CANVAS_IMAGE_ERROR_MESSAGE));
      image.src = url;
    });

    canvas = document.createElement("canvas");
    canvas.width = Math.max(
      MIN_PIXEL_SIZE,
      Math.ceil(bounds.width * pixelRatio)
    );
    canvas.height = Math.max(
      MIN_PIXEL_SIZE,
      Math.ceil(bounds.height * pixelRatio)
    );
    canvas
      .getContext("2d")
      ?.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas?.toBlob(resolve, PNG_IMAGE_MIME_TYPE)
    );

    if (!pngBlob) {
      return null;
    }

    await navigator.clipboard.write([
      new ClipboardItem({ [PNG_IMAGE_MIME_TYPE]: pngBlob })
    ]);

    return {
      createdAt: Date.now(),
      dpi,
      height: bounds.height,
      width: bounds.width
    };
  } finally {
    image.onload = null;
    image.onerror = null;
    URL.revokeObjectURL(url);

    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
