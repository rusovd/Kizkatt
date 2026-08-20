import {
  MIN_ELEMENT_SIZE,
  SINGLE_SELECTION_COUNT
} from "kizkatt-graphic-engine";
import { getResizeCursor } from "kizkatt-graphic-engine";
import { getElementMap, getIdSet } from "kizkatt-graphic-engine";
import type {
  Bounds,
  Interaction,
  KizkattElement,
  Point,
  Size
} from "kizkatt-graphic-engine";

export function getImagePlacementBounds(
  interaction: Interaction | null,
  previewPoint: Point | null,
  intrinsicSize: Size
): Bounds | null {
  if (interaction?.type === "imageCreate") {
    if (!interaction.hasMoved) {
      return {
        ...interaction.origin,
        ...intrinsicSize
      };
    }

    return {
      height: Math.max(
        MIN_ELEMENT_SIZE,
        Math.abs(interaction.current.y - interaction.origin.y)
      ),
      width: Math.max(
        MIN_ELEMENT_SIZE,
        Math.abs(interaction.current.x - interaction.origin.x)
      ),
      x: Math.min(interaction.origin.x, interaction.current.x),
      y: Math.min(interaction.origin.y, interaction.current.y)
    };
  }

  return previewPoint
    ? {
        ...previewPoint,
        ...intrinsicSize
      }
    : null;
}

export function getActiveInteractionCursor(interaction: Interaction | null) {
  if (!interaction) {
    return null;
  }

  if (interaction.type === "resize") {
    if (!interaction.handle) {
      return "move";
    }

    const selectedIdSet = getIdSet(interaction.selectedIds);
    const selectedOriginalElements = interaction.originalElements.filter(
      (element) => selectedIdSet.has(element.id)
    );
    const selectedElement =
      selectedOriginalElements.length === SINGLE_SELECTION_COUNT
        ? selectedOriginalElements[0]
        : null;

    return getResizeCursor(
      selectedElement?.angle ?? 0,
      interaction.handle,
      selectedElement?.flipX,
      selectedElement?.flipY
    );
  }

  if (
    interaction.type === "linearEndpoint" &&
    interaction.mode === "node"
  ) {
    return "move";
  }

  if (
    interaction.type === "bend" ||
    interaction.type === "linearEndpoint" ||
    interaction.type === "move" ||
    interaction.type === "rotate" ||
    interaction.type === "skew"
  ) {
    return "grabbing";
  }

  return null;
}

export function isPreviewTransformInteraction(
  interaction: Interaction | null
): interaction is Extract<Interaction, { originalElements: KizkattElement[] }> {
  return (
    interaction?.type === "move" ||
    interaction?.type === "resize" ||
    interaction?.type === "rotate" ||
    interaction?.type === "skew" ||
    interaction?.type === "bend" ||
    interaction?.type === "linearEndpoint"
  );
}

export function getPreviewDisplayElements(
  elements: KizkattElement[],
  interaction: Interaction | null
) {
  if (!isPreviewTransformInteraction(interaction)) {
    return elements;
  }

  const selectedIdSet = getIdSet(interaction.selectedIds);
  const originalElementById = getElementMap(interaction.originalElements);

  return elements.map((element) =>
    selectedIdSet.has(element.id)
      ? originalElementById.get(element.id) ?? element
      : element
    );
}
