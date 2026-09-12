import {
  DEFAULT_DPI
} from "../config/constants";
import { getDpiPixelRatio } from "../geometry/dpi";
import type { KizkattElement } from "../model/types";
import { getExportBounds } from "./exportBounds";
import {
  addKizkattSvgMetadata,
  serializeSvg,
  type KizkattSvgMetadata
} from "./svgExport";

import { embedBitmapTextureFragmentsInSvg } from "./bitmapTextureSvgEmbedding";

export async function exportSceneAsSvg({
  dpi = DEFAULT_DPI,
  elements,
  metadata,
  svg
}: {
  dpi?: number;
  elements: KizkattElement[];
  metadata?: KizkattSvgMetadata;
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
