import type { Bounds } from "../model/types";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const KIZKATT_SVG_METADATA_ID = "kizkatt-document-metadata";
export const KIZKATT_SVG_DESCRIPTION = "Created with Kizkatt";

export type KizkattSvgMetadata = {
  changed?: string;
  created?: string;
};

export type SvgSerializeOptions = {
  bounds?: Bounds;
  elementIds?: string[];
  pixelRatio?: number;
  scaleStrokes?: boolean;
  transparentBackground?: boolean;
};

function getSceneGroup(svg: SVGSVGElement) {
  return Array.from(svg.children).find(
    (element) => element.tagName.toLowerCase() === "g"
  );
}

export function serializeSvg(
  svg: SVGSVGElement,
  options: SvgSerializeOptions = {}
) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute("xmlns");
  clone
    .querySelectorAll(
      [
        ".kizkatt-selection-overlay",
        ".kizkatt-line-overlay",
        ".kizkatt-multi-selection",
        "[data-export-ignore]",
        "[data-element-overlay-id]"
      ].join(", ")
    )
    .forEach((element) => element.remove());

  if (options.elementIds) {
    const elementIdSet = new Set(options.elementIds);

    clone.querySelectorAll("[data-element-id]").forEach((element) => {
      const elementId = element.getAttribute("data-element-id");

      if (!elementId || !elementIdSet.has(elementId)) {
        element.remove();
      }
    });
  }

  if (options.bounds) {
    const pixelRatio = options.pixelRatio ?? 1;
    const width = Math.max(1, Math.ceil(options.bounds.width * pixelRatio));
    const height = Math.max(1, Math.ceil(options.bounds.height * pixelRatio));

    clone.setAttribute("width", `${width}`);
    clone.setAttribute("height", `${height}`);
    clone.setAttribute(
      "viewBox",
      `${options.bounds.x} ${options.bounds.y} ${options.bounds.width} ${options.bounds.height}`
    );
    getSceneGroup(clone)?.removeAttribute("transform");
    clone
      .querySelectorAll(
        [
          ".kizkatt-grid",
          ".kizkatt-grid-major",
          "#kizkatt-grid-minor",
          "#kizkatt-grid-major"
        ].join(", ")
      )
      .forEach((element) => element.remove());
  }

  if (options.scaleStrokes) {
    clone
      .querySelectorAll("[vector-effect]")
      .forEach((element) => element.removeAttribute("vector-effect"));
  }

  if (options.transparentBackground) {
    clone.style.background = "transparent";
    clone.style.backgroundColor = "transparent";
  }

  return new XMLSerializer().serializeToString(clone);
}

export function addKizkattSvgMetadata(
  markup: string,
  metadata: KizkattSvgMetadata = {}
) {
  const document = new DOMParser().parseFromString(markup, "image/svg+xml");
  const root = document.documentElement;

  if (root.localName !== "svg" || document.querySelector("parsererror")) {
    return markup;
  }

  root.setAttribute("xmlns", SVG_NAMESPACE);
  root.querySelector(`#${KIZKATT_SVG_METADATA_ID}`)?.remove();

  const metadataElement = document.createElementNS(SVG_NAMESPACE, "metadata");
  metadataElement.id = KIZKATT_SVG_METADATA_ID;
  metadataElement.setAttribute("data-generator", "Kizkatt");
  metadataElement.textContent = JSON.stringify({
    description: KIZKATT_SVG_DESCRIPTION,
    generator: "Kizkatt",
    ...(metadata.created ? { created: metadata.created } : {}),
    ...(metadata.changed ? { changed: metadata.changed } : {})
  });
  root.insertBefore(metadataElement, root.firstChild);

  return new XMLSerializer().serializeToString(root);
}
