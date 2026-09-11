import {
  addKizkattSvgMetadata,
  DEFAULT_DPI,
  getDpiPixelRatio,
  getExportBounds,
  type KizkattElement,
  type KizkattSvgMetadata,
  type SvgSerializeOptions
} from "kizkatt-graphic-engine";

import { embedBitmapTextureFragmentsInSvg } from "./bitmapTextureSvgEmbedding";

type SerializeSvg = (
  svg: SVGSVGElement,
  options?: SvgSerializeOptions
) => string;

export async function exportSceneAsSvg({
  dpi = DEFAULT_DPI,
  elements,
  metadata,
  serializeSvg,
  svg
}: {
  dpi?: number;
  elements: KizkattElement[];
  metadata?: KizkattSvgMetadata;
  serializeSvg: SerializeSvg;
  svg: SVGSVGElement;
}) {
  const bounds = getExportBounds(elements);
  const markup = serializeSvg(svg, {
    ...(bounds ? { bounds } : {}),
    elementIds: elements.map((element) => element.id),
    transparentBackground: true
  });
  const embeddedMarkup = await embedBitmapTextureFragmentsInSvg(
    markup,
    elements,
    { pixelRatio: getDpiPixelRatio(dpi) }
  );

  return addKizkattSvgMetadata(embeddedMarkup, metadata);
}
