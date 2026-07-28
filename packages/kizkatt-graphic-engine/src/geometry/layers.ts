import type { KizkattElement } from "../model/types";

export function reorderElementsByLayerAction(
  elements: KizkattElement[],
  selectedIds: string[],
  action: "back" | "backward" | "forward" | "front"
) {
  const selected = new Set(selectedIds);

  if (selected.size === 0) {
    return elements;
  }

  if (action === "back") {
    return [
      ...elements.filter((element) => selected.has(element.id)),
      ...elements.filter((element) => !selected.has(element.id))
    ];
  }

  if (action === "front") {
    return [
      ...elements.filter((element) => !selected.has(element.id)),
      ...elements.filter((element) => selected.has(element.id))
    ];
  }

  const nextElements = [...elements];

  if (action === "backward") {
    for (let index = 1; index < nextElements.length; index += 1) {
      if (
        selected.has(nextElements[index].id) &&
        !selected.has(nextElements[index - 1].id)
      ) {
        [nextElements[index - 1], nextElements[index]] = [
          nextElements[index],
          nextElements[index - 1]
        ];
      }
    }
  } else {
    for (let index = nextElements.length - 2; index >= 0; index -= 1) {
      if (
        selected.has(nextElements[index].id) &&
        !selected.has(nextElements[index + 1].id)
      ) {
        [nextElements[index], nextElements[index + 1]] = [
          nextElements[index + 1],
          nextElements[index]
        ];
      }
    }
  }

  return nextElements;
}
