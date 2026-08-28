import {
  getCoveredBitmapSourcePoint,
  type BitmapTextureSize,
  type Point
} from "kizkatt-graphic-engine";

export const STANDARD_IMAGE_FILE_ACCEPT = [
  "image/avif",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp"
].join(",");

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

export async function getImageFileSize(
  file: File,
  fallback: BitmapTextureSize
) {
  if (typeof createImageBitmap !== "function") {
    return fallback;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const size = { height: bitmap.height, width: bitmap.width };
    bitmap.close();
    return size;
  } catch {
    return fallback;
  }
}

export function getCoveredImagePixelColor(
  image: HTMLImageElement,
  viewport: Pick<DOMRect, "height" | "left" | "top" | "width">,
  clientPoint: Point
): [number, number, number, number] | null {
  if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    return null;
  }

  const sourcePoint = getCoveredBitmapSourcePoint(
    { height: image.naturalHeight, width: image.naturalWidth },
    { height: viewport.height, width: viewport.width },
    { x: clientPoint.x - viewport.left, y: clientPoint.y - viewport.top }
  );
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return null;
  }

  canvas.width = 1;
  canvas.height = 1;

  try {
    context.drawImage(
      image,
      sourcePoint.x,
      sourcePoint.y,
      1,
      1,
      0,
      0,
      1,
      1
    );
    const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;

    return [red, green, blue, alpha];
  } catch {
    return null;
  }
}

export function rgbToHexColor(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((channel) =>
      Math.round(Math.min(255, Math.max(0, channel)))
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;
}
