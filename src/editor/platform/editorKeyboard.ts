import type { KeyboardEvent } from "react";

import { EDITABLE_KEYBOARD_TARGET_SELECTORS } from "kizkatt-graphic-engine";
import { isPrimaryShortcutModifierPressed } from "kizkatt-ui";

const EDITABLE_KEYBOARD_TARGET_SELECTOR =
  EDITABLE_KEYBOARD_TARGET_SELECTORS.join(", ");

export const EDITING_SHORTCUT_KEY = {
  copy: "c",
  cut: "x",
  group: "g",
  load: "o",
  new: "n",
  paste: "v",
  print: "p",
  redo: "y",
  save: "s",
  selectAll: "a",
  ungroup: "u",
  undo: "z"
} as const;

export const EDITOR_KEY = {
  arrowDown: "ArrowDown",
  arrowLeft: "ArrowLeft",
  arrowRight: "ArrowRight",
  arrowUp: "ArrowUp",
  delete: "Delete",
  pageDown: "PageDown",
  pageUp: "PageUp"
} as const;

const ALLOWED_EDITING_SHORTCUT_KEYS = new Set<string>(
  Object.values(EDITING_SHORTCUT_KEY)
);

export function isEditableKeyboardTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest(EDITABLE_KEYBOARD_TARGET_SELECTOR))
  );
}

export function isAllowedEditingShortcut(event: KeyboardEvent<HTMLElement>) {
  return (
    isPrimaryShortcutModifierPressed(event) &&
    ALLOWED_EDITING_SHORTCUT_KEYS.has(event.key.toLowerCase())
  );
}

export function stopDrawingEngineShortcuts(event: KeyboardEvent<HTMLElement>) {
  if (
    isEditableKeyboardTarget(event.target) ||
    isAllowedEditingShortcut(event)
  ) {
    return;
  }

  event.stopPropagation();
  event.nativeEvent.stopImmediatePropagation?.();
}
