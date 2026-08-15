import { SINGLE_SELECTION_COUNT } from "../config/constants";
import { getResizeCursor } from "../geometry";
import { getElementMap, getIdSet } from "../model/collections";
import type { Interaction, KizkattElement } from "../model/types";

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
    const angle =
      selectedOriginalElements.length === SINGLE_SELECTION_COUNT
        ? selectedOriginalElements[0].angle
        : 0;

    return getResizeCursor(angle, interaction.handle);
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
