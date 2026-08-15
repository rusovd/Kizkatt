import type { KizkattElement } from "./types";

const idSetCache = new WeakMap<readonly string[], ReadonlySet<string>>();
const elementMapCache = new WeakMap<
  readonly KizkattElement[],
  ReadonlyMap<string, KizkattElement>
>();

export function getIdSet(ids: readonly string[]) {
  const cachedSet = idSetCache.get(ids);

  if (cachedSet) {
    return cachedSet;
  }

  const idSet = new Set(ids);
  idSetCache.set(ids, idSet);

  return idSet;
}

export function getElementMap(elements: readonly KizkattElement[]) {
  const cachedMap = elementMapCache.get(elements);

  if (cachedMap) {
    return cachedMap;
  }

  const elementMap = new Map(
    elements.map((element) => [element.id, element] as const)
  );
  elementMapCache.set(elements, elementMap);

  return elementMap;
}
