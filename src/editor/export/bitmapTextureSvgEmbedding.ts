import {
  createEmbeddedBitmapTextureFill,
  getElementBounds,
  MIN_PIXEL_SIZE,
  PNG_IMAGE_MIME_TYPE,
  SVG_IMAGE_MIME_TYPE,
  type KizkattElement
} from "kizkatt-graphic-engine";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const SVG_DOCUMENT_MIME_TYPE = "image/svg+xml";
const DEFAULT_PIXEL_RATIO = 1;

type BitmapTextureFragmentRasterizer = (
  pattern: SVGPatternElement,
  element: KizkattElement,
  pixelRatio: number
) => Promise<string | null>;

function getElementGroup(
  document: Document,
  elementId: string
): Element | null {
  return (
    Array.from(document.querySelectorAll("[data-element-id]")).find(
      (group) => group.getAttribute("data-element-id") === elementId
    ) ?? null
  );
}

function getDirectMetadata(group: Element): Element | null {
  return (
    Array.from(group.children).find(
      (child) => child.localName === "metadata"
    ) ?? null
  );
}

async function inlineSvgImages(root: ParentNode) {
  const sources = new Map<string, Promise<string | null>>();
  const images = Array.from(root.querySelectorAll("image"));

  await Promise.all(
    images.map(async (image) => {
      const source = image.getAttribute("href");

      if (!source || source.startsWith("data:")) {
        return;
      }

      let embeddedSource = sources.get(source);
      if (!embeddedSource) {
        embeddedSource = fetch(source)
          .then((response) => (response.ok ? response.blob() : null))
          .then((blob) => (blob ? getBlobDataUrl(blob) : null))
          .catch(() => null);
        sources.set(source, embeddedSource);
      }

      const dataUrl = await embeddedSource;
      if (dataUrl) {
        image.setAttribute("href", dataUrl);
      }
    })
  );
}

async function createTextureFragmentSvg(
  pattern: SVGPatternElement,
  element: KizkattElement,
  pixelRatio: number
) {
  const bounds = getElementBounds(element);
  const width = Math.max(MIN_PIXEL_SIZE, Math.abs(bounds.width));
  const height = Math.max(MIN_PIXEL_SIZE, Math.abs(bounds.height));
  const document = pattern.ownerDocument.implementation.createDocument(
    SVG_NAMESPACE,
    "svg"
  );
  const root = document.documentElement;
  const definitions = pattern.closest("defs");
  const patternId = pattern.id;

  if (!definitions || !patternId) {
    return null;
  }

  root.setAttribute("xmlns", SVG_NAMESPACE);
  root.setAttribute("width", `${Math.max(1, Math.ceil(width * pixelRatio))}`);
  root.setAttribute("height", `${Math.max(1, Math.ceil(height * pixelRatio))}`);
  root.setAttribute(
    "viewBox",
    `${bounds.x} ${bounds.y} ${width} ${height}`
  );
  root.append(document.importNode(definitions, true));

  const rectangle = document.createElementNS(SVG_NAMESPACE, "rect");
  rectangle.setAttribute("x", `${bounds.x}`);
  rectangle.setAttribute("y", `${bounds.y}`);
  rectangle.setAttribute("width", `${width}`);
  rectangle.setAttribute("height", `${height}`);
  rectangle.setAttribute("fill", `url(#${patternId})`);
  root.append(rectangle);

  await inlineSvgImages(root);

  return new XMLSerializer().serializeToString(document);
}

function loadSvgImage(markup: string) {
  const blob = new Blob([markup], { type: SVG_IMAGE_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const image = new Image();

  return new Promise<{ image: HTMLImageElement; url: string }>(
    (resolve, reject) => {
      image.onload = () => resolve({ image, url });
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Unable to rasterize the bitmap texture fragment"));
      };
      image.src = url;
    }
  );
}

function getCanvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, PNG_IMAGE_MIME_TYPE)
  );
}

function getBlobDataUrl(blob: Blob) {
  return new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(blob);
  });
}

async function rasterizeBitmapTextureFragment(
  pattern: SVGPatternElement,
  element: KizkattElement,
  pixelRatio: number
) {
  const markup = await createTextureFragmentSvg(
    pattern,
    element,
    pixelRatio
  );

  if (!markup) {
    return null;
  }

  const { image, url } = await loadSvgImage(markup);
  const bounds = getElementBounds(element);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(
    1,
    Math.ceil(Math.abs(bounds.width) * pixelRatio)
  );
  canvas.height = Math.max(
    1,
    Math.ceil(Math.abs(bounds.height) * pixelRatio)
  );

  try {
    const context = canvas.getContext("2d");

    if (!context) {
      return null;
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await getCanvasBlob(canvas);
    return blob ? getBlobDataUrl(blob) : null;
  } finally {
    image.onload = null;
    image.onerror = null;
    URL.revokeObjectURL(url);
    canvas.width = 0;
    canvas.height = 0;
  }
}

function replacePatternWithEmbeddedFragment(
  pattern: SVGPatternElement,
  source: string,
  targetSize: { height: number; width: number },
  textureId: string
) {
  pattern.replaceChildren();
  pattern.setAttribute("x", "0");
  pattern.setAttribute("y", "0");
  pattern.setAttribute("width", "1");
  pattern.setAttribute("height", "1");
  pattern.setAttribute("patternUnits", "objectBoundingBox");
  pattern.setAttribute("patternContentUnits", "userSpaceOnUse");
  pattern.setAttribute(
    "viewBox",
    `0 0 ${targetSize.width} ${targetSize.height}`
  );
  pattern.setAttribute("preserveAspectRatio", "none");
  pattern.setAttribute("data-bitmap-texture", textureId);
  pattern.setAttribute("data-bitmap-repeat", "none");
  pattern.setAttribute("data-texture-anchor", "center");
  pattern.setAttribute("data-texture-coordinate-space", "object");
  pattern.removeAttribute("patternTransform");

  const image = pattern.ownerDocument.createElementNS(
    SVG_NAMESPACE,
    "image"
  );
  image.setAttribute("href", source);
  image.setAttribute("x", "0");
  image.setAttribute("y", "0");
  image.setAttribute("width", `${targetSize.width}`);
  image.setAttribute("height", `${targetSize.height}`);
  image.setAttribute("preserveAspectRatio", "none");
  image.setAttribute("data-texture-blend", "normal");
  pattern.append(image);
}

export async function embedBitmapTextureFragmentsInSvg(
  markup: string,
  elements: readonly KizkattElement[],
  {
    pixelRatio = DEFAULT_PIXEL_RATIO,
    rasterize = rasterizeBitmapTextureFragment
  }: {
    pixelRatio?: number;
    rasterize?: BitmapTextureFragmentRasterizer;
  } = {}
) {
  const document = new DOMParser().parseFromString(
    markup,
    SVG_DOCUMENT_MIME_TYPE
  );

  for (const element of elements) {
    if (!element.bitmapTexture) {
      continue;
    }

    const group = getElementGroup(document, element.id);
    const pattern = group?.querySelector<SVGPatternElement>(
      "pattern[data-bitmap-texture]"
    );
    const metadataElement = group ? getDirectMetadata(group) : null;

    if (!pattern || !metadataElement?.textContent) {
      continue;
    }

    let source: string | null = null;
    try {
      source = await rasterize(pattern, element, pixelRatio);
    } catch {
      source = null;
    }

    if (!source) {
      continue;
    }

    const bounds = getElementBounds(element);
    const targetSize = {
      height: Math.max(MIN_PIXEL_SIZE, Math.abs(bounds.height)),
      width: Math.max(MIN_PIXEL_SIZE, Math.abs(bounds.width))
    };
    const textureId = `embedded:${element.id}:${element.bitmapTexture.textureId}`;
    const embeddedTexture = createEmbeddedBitmapTextureFill({
      name: element.bitmapTexture.name,
      source,
      targetSize,
      textureId
    });

    try {
      const metadata = JSON.parse(metadataElement.textContent) as Record<
        string,
        unknown
      >;
      metadata.bitmapTexture = embeddedTexture;
      metadataElement.textContent = JSON.stringify(metadata);
    } catch {
      continue;
    }

    replacePatternWithEmbeddedFragment(
      pattern,
      source,
      targetSize,
      textureId
    );
  }

  
  
  await inlineSvgImages(document.documentElement);

  return new XMLSerializer().serializeToString(document.documentElement);
}
