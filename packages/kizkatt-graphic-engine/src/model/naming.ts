import type { ElementType, KizkattElement } from "./types";
import {
  DEFAULT_ELEMENT_NAME_BY_TYPE,
  DEFAULT_GROUP_NAME
} from "../config/constants";

export type ElementNamingConfig = {
  elementNameByType?: Partial<Record<ElementType, string>>;
  groupName?: string;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getNextNumber(names: Iterable<string | undefined>, baseName: string) {
  const matcher = new RegExp(`^${escapeRegExp(baseName)} (\\d+)$`);
  let maxNumber = 0;

  for (const name of names) {
    const match = name?.match(matcher);

    if (!match) {
      continue;
    }

    maxNumber = Math.max(maxNumber, Number(match[1]));
  }

  return maxNumber + 1;
}

export function createElementName(
  type: ElementType,
  elements: readonly KizkattElement[],
  naming: ElementNamingConfig = {}
) {
  const baseName =
    naming.elementNameByType?.[type] ?? DEFAULT_ELEMENT_NAME_BY_TYPE[type];
  const sameTypeNames = elements
    .filter((element) => element.type === type)
    .map((element) => element.name);

  return `${baseName} ${getNextNumber(sameTypeNames, baseName)}`;
}

export function createGroupName(
  elements: readonly KizkattElement[],
  naming: ElementNamingConfig = {}
) {
  const groupNamesById = new Map<string, string>();
  const baseName = naming.groupName ?? DEFAULT_GROUP_NAME;

  for (const element of elements) {
    if (element.groupId && element.groupName) {
      groupNamesById.set(element.groupId, element.groupName);
    }
  }

  return `${baseName} ${getNextNumber(groupNamesById.values(), baseName)}`;
}

export function getElementDisplayName(
  element: KizkattElement,
  naming: ElementNamingConfig = {}
) {
  return (
    element.name ??
    naming.elementNameByType?.[element.type] ??
    DEFAULT_ELEMENT_NAME_BY_TYPE[element.type]
  );
}

export function normalizeElementNames(
  elements: readonly KizkattElement[],
  naming: ElementNamingConfig = {}
) {
  const nextElements: KizkattElement[] = [];
  const groupNamesById = new Map<string, string>();

  for (const element of elements) {
    if (element.groupId && element.groupName) {
      groupNamesById.set(element.groupId, element.groupName);
    }
  }

  for (const element of elements) {
    const groupName = element.groupId
      ? groupNamesById.get(element.groupId) ??
        createGroupName([...nextElements, ...elements], naming)
      : undefined;

    if (element.groupId && groupName) {
      groupNamesById.set(element.groupId, groupName);
    }

    nextElements.push({
      ...element,
      groupName,
      name: element.name ?? createElementName(element.type, nextElements, naming)
    });
  }

  return nextElements;
}
