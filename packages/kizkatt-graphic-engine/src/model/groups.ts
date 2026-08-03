import type { KizkattElement } from "./types";
import { createElementName, createGroupName } from "./naming";
import type { ElementNamingConfig } from "./naming";

export function expandElementIdsToGroups(
  elements: KizkattElement[],
  ids: string[]
) {
  const selectedIds = new Set(ids);
  const selectedGroupIds = new Set(
    elements
      .filter((element) => selectedIds.has(element.id) && element.groupId)
      .map((element) => element.groupId as string)
  );

  return elements
    .filter(
      (element) =>
        selectedIds.has(element.id) ||
        (element.groupId ? selectedGroupIds.has(element.groupId) : false)
    )
    .map((element) => element.id);
}

export function getNextSelectedIdsForHit(
  elements: KizkattElement[],
  currentSelectedIds: string[],
  hitElementId: string,
  mode: "add" | "remove" | "replace" = "replace"
) {
  const hitSelectionIds = expandElementIdsToGroups(elements, [hitElementId]);

  if (mode === "add") {
    return Array.from(new Set([...currentSelectedIds, ...hitSelectionIds]));
  }

  if (mode === "remove") {
    const hitSelectedIds = new Set(hitSelectionIds);

    return currentSelectedIds.filter((id) => !hitSelectedIds.has(id));
  }

  return currentSelectedIds.includes(hitElementId)
    ? currentSelectedIds
    : hitSelectionIds;
}

function getSelectionUnits(elements: KizkattElement[], selectedIds: string[]) {
  const expandedSelectedIds = new Set(
    expandElementIdsToGroups(elements, selectedIds)
  );
  const units = new Set<string>();

  for (const element of elements) {
    if (!expandedSelectedIds.has(element.id)) {
      continue;
    }

    units.add(element.groupId ? `group:${element.groupId}` : `element:${element.id}`);
  }

  return units;
}

export function canGroupSelection(
  elements: KizkattElement[],
  selectedIds: string[]
) {
  return getSelectionUnits(elements, selectedIds).size > 1;
}

export function canUngroupSelection(
  elements: KizkattElement[],
  selectedIds: string[]
) {
  const expandedSelectedIds = new Set(
    expandElementIdsToGroups(elements, selectedIds)
  );

  return elements.some(
    (element) => expandedSelectedIds.has(element.id) && Boolean(element.groupId)
  );
}

export function groupSelectedElements(
  elements: KizkattElement[],
  selectedIds: string[],
  groupId: string,
  groupName = createGroupName(elements)
) {
  const groupedIds = new Set(expandElementIdsToGroups(elements, selectedIds));

  return elements.map((element) =>
    groupedIds.has(element.id) ? { ...element, groupId, groupName } : element
  );
}

export function ungroupSelectedElements(
  elements: KizkattElement[],
  selectedIds: string[]
) {
  const expandedSelectedIds = new Set(
    expandElementIdsToGroups(elements, selectedIds)
  );
  const groupIdsToUngroup = new Set(
    elements
      .filter((element) => expandedSelectedIds.has(element.id) && element.groupId)
      .map((element) => element.groupId as string)
  );

  return elements.map((element) =>
    element.groupId && groupIdsToUngroup.has(element.groupId)
      ? { ...element, groupId: undefined, groupName: undefined }
      : element
  );
}

export function cloneElementsWithFreshIdsAndGroups(
  elements: KizkattElement[],
  createId: () => string,
  offset = 24,
  existingElements: KizkattElement[] = [],
  naming: ElementNamingConfig = {}
) {
  const groupIdMap = new Map<string, string>();
  const groupNameMap = new Map<string, string>();
  const clonedElements: KizkattElement[] = [];
  const createGroupId = (originalGroupId: string) => {
    const nextGroupId = createId();
    const nextGroupName = createGroupName([
      ...existingElements,
      ...clonedElements
    ], naming);

    groupIdMap.set(originalGroupId, nextGroupId);
    groupNameMap.set(originalGroupId, nextGroupName);

    return nextGroupId;
  };

  return elements.map((element) => {
    const groupId = element.groupId
      ? groupIdMap.get(element.groupId) ?? createGroupId(element.groupId)
      : undefined;
    const groupName = element.groupId
      ? groupNameMap.get(element.groupId) ??
        createGroupName(existingElements, naming)
      : undefined;

    const nextElement = {
      ...element,
      groupId,
      groupName,
      id: createId(),
      name: createElementName(
        element.type,
        [...existingElements, ...clonedElements],
        naming
      ),
      x: element.x + offset,
      y: element.y + offset
    };

    clonedElements.push(nextElement);

    return nextElement;
  });
}
