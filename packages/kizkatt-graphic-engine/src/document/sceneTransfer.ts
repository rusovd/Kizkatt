import { cloneElementsWithFreshIdsAndGroups } from "../model/groups";
import type { ElementNamingConfig } from "../model/naming";
import { withUpdatedObjectBase } from "../model/element";
import type {
  Dpi,
  KizkattElement,
  StyleState
} from "../model/types";
import { importSvgElements } from "../svg/import";
import { exportSceneAsSvg } from "../export/sceneSvgExport";
import {
  createKizkattSceneDocument,
  getKizkattDocumentCanvasState,
  parseKizkattSceneDocument,
  serializeKizkattSceneDocument,
  type KizkattSceneDocument,
  type KizkattSceneMetadata,
  type KizkattSceneSettings
} from "./sceneDocument";
import type { SceneFileFormat } from "./sceneFile";

export async function createSceneExport({
  dpi,
  elements,
  format,
  meta,
  settings,
  svg
}: {
  dpi: Dpi;
  elements: KizkattElement[];
  format: SceneFileFormat;
  meta?: Partial<KizkattSceneMetadata>;
  settings: KizkattSceneSettings;
  svg: SVGSVGElement | null;
}): Promise<{
  contents: string;
  document: KizkattSceneDocument;
} | null> {
  if (format === "svg" && !svg) {
    return null;
  }

  const document = createKizkattSceneDocument({
    canvasState: { elements, selectedIds: [] },
    meta,
    settings
  });
  const contents = format === "kk"
    ? serializeKizkattSceneDocument(document)
    : await exportSceneAsSvg({
        dpi,
        elements,
        metadata: document.kk.meta,
        svg: svg as SVGSVGElement
      });

  return { contents, document };
}

export function importSceneElements({
  contents,
  createElementId,
  existingElements,
  fallbackSettings,
  fallbackStyle,
  format,
  naming
}: {
  contents: string;
  createElementId: () => string;
  existingElements: KizkattElement[];
  fallbackSettings: KizkattSceneSettings;
  fallbackStyle: StyleState;
  format: SceneFileFormat;
  naming?: ElementNamingConfig;
}) {
  if (format === "svg") {
    return importSvgElements(contents, {
      existingElements,
      fallbackStyle,
      naming
    });
  }

  const document = parseKizkattSceneDocument(contents, {
    fallbackSettings,
    naming
  });

  if (!document) {
    return null;
  }

  return cloneElementsWithFreshIdsAndGroups(
    getKizkattDocumentCanvasState(document, naming).elements,
    createElementId,
    0,
    existingElements,
    naming
  ).map(withUpdatedObjectBase);
}
