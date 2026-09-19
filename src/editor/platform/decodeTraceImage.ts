import type { SimpleTraceRaster } from "kizkatt-graphic-engine";

const DEFAULT_TRACE_MAX_DIMENSION = 384;

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    if (/^https?:/i.test(source)) {
      image.crossOrigin = "anonymous";
    }

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The selected bitmap could not be loaded."));
    image.src = source;

    if (image.complete && image.naturalWidth > 0) {
      resolve(image);
    }
  });
}

export async function decodeImageForSimpleTrace(
  source: string,
  maximumDimension = DEFAULT_TRACE_MAX_DIMENSION
): Promise<SimpleTraceRaster> {
  const image = await loadImage(source);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error("The selected bitmap has no readable pixels.");
  }

  const scale = Math.min(1, maximumDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", {
    alpha: true,
    willReadFrequently: true
  });

  if (!context) {
    throw new Error("Bitmap tracing is unavailable in this browser.");
  }

  context.drawImage(image, 0, 0, width, height);

  try {
    const imageData = context.getImageData(0, 0, width, height);

    return { data: imageData.data, height, width };
  } catch {
    throw new Error(
      "This bitmap cannot be traced because its pixels are protected by its source."
    );
  }
}
