import {
  DUPLICATED_ELEMENT_OFFSET,
  EMPTY_COLLECTION_LENGTH
} from "../config/constants";
import {
  createId,
  revertElementToObjectBase,
  withUpdatedObjectBase
} from "../model/element";
import {
  breakApartLineCombinationElements,
  cloneElementsWithFreshIdsAndGroups,
  expandElementIdsToGroups,
  getSelectedLineCombinationIds,
  groupSelectedElements,
  ungroupSelectedElements
} from "../model/groups";
import { createGroupName } from "../model/naming";
import type { ElementNamingConfig } from "../model/naming";
import type { CanvasState, KizkattElement } from "../model/types";
import {
  breakApartSvgElement
} from "../svg/import";
import { isBreakApartableSvgElement } from "../svg/parsing";

export function selectAllElements(canvasState: CanvasState): CanvasState {
  return {
    ...canvasState,
    selectedBend: undefined,
    selectedIds: canvasState.elements.map((element) => element.id)
  };
}

export function cloneElementsIntoCanvas(
  canvasState: CanvasState,
  sourceElements: KizkattElement[],
  naming?: ElementNamingConfig
): CanvasState {
  const clonedElements = cloneElementsWithFreshIdsAndGroups(
    sourceElements,
    createId,
    DUPLICATED_ELEMENT_OFFSET,
    canvasState.elements,
    naming
  ).map(withUpdatedObjectBase);

  return {
    elements: [...canvasState.elements, ...clonedElements],
    selectedBend: undefined,
    selectedIds: clonedElements.map((element) => element.id)
  };
}

export function groupCanvasSelection(
  canvasState: CanvasState,
  naming?: ElementNamingConfig
): CanvasState {
  const selectedIds = expandElementIdsToGroups(
    canvasState.elements,
    canvasState.selectedIds
  );

  return {
    elements: groupSelectedElements(
      canvasState.elements,
      selectedIds,
      createId(),
      createGroupName(canvasState.elements, naming)
    ),
    selectedBend: undefined,
    selectedIds
  };
}

export function ungroupCanvasSelection(canvasState: CanvasState): CanvasState {
  const selectedIds = expandElementIdsToGroups(
    canvasState.elements,
    canvasState.selectedIds
  );

  return {
    elements: ungroupSelectedElements(canvasState.elements, selectedIds),
    selectedBend: undefined,
    selectedIds
  };
}

export function breakApartLineCombinationCanvasSelection(
  canvasState: CanvasState
): CanvasState | null {
  const lineCombinationIds = getSelectedLineCombinationIds(
    canvasState.elements,
    canvasState.selectedIds
  );

  if (lineCombinationIds.size === EMPTY_COLLECTION_LENGTH) {
    return null;
  }

  const selectedIds = canvasState.elements
    .filter(
      (element) =>
        element.lineCombinationId &&
        lineCombinationIds.has(element.lineCombinationId)
    )
    .map((element) => element.id);

  return {
    elements: breakApartLineCombinationElements(
      canvasState.elements,
      selectedIds
    ),
    selectedBend: undefined,
    selectedIds,
    selectedNodes: undefined
  };
}

export function breakApartCanvasSelection(
  canvasState: CanvasState,
  selectedElements: KizkattElement[],
  naming?: ElementNamingConfig
): CanvasState | null {
  const importedElementsBySourceId = new Map<string, KizkattElement[]>();

  selectedElements.forEach((element) => {
    if (!isBreakApartableSvgElement(element)) {
      return;
    }

    const importedElements = breakApartSvgElement(
      element,
      canvasState.elements,
      element,
      naming
    );

    if (importedElements.length > EMPTY_COLLECTION_LENGTH) {
      importedElementsBySourceId.set(element.id, importedElements);
    }
  });

  if (importedElementsBySourceId.size === EMPTY_COLLECTION_LENGTH) {
    return null;
  }

  return {
    elements: canvasState.elements.flatMap(
      (element) => importedElementsBySourceId.get(element.id) ?? [element]
    ),
    selectedBend: undefined,
    selectedIds: Array.from(importedElementsBySourceId.values())
      .flat()
      .map((element) => element.id)
  };
}

export function updateObjectBases(
  canvasState: CanvasState,
  elementIds: ReadonlySet<string>
): CanvasState {
  return {
    ...canvasState,
    elements: canvasState.elements.map((element) =>
      elementIds.has(element.id) ? withUpdatedObjectBase(element) : element
    )
  };
}

export function revertObjectBases(
  canvasState: CanvasState,
  elementIds: ReadonlySet<string>
): CanvasState {
  return {
    ...canvasState,
    elements: canvasState.elements.map((element) =>
      elementIds.has(element.id)
        ? revertElementToObjectBase(element)
        : element
    ),
    selectedBend: undefined
  };
}
