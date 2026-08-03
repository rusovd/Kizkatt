import type { KeyboardEvent } from "react";

import { EDITABLE_KEYBOARD_TARGET_SELECTORS } from "../config/constants";

const EDITABLE_KEYBOARD_TARGET_SELECTOR =
  EDITABLE_KEYBOARD_TARGET_SELECTORS.join(", ");

export const EDITING_SHORTCUT_KEY = {
  copy: "c",
  paste: "v",
  redo: "y",
  selectAll: "a",
  undo: "z"
} as const;

export const EDITOR_KEY = {
  delete: "Delete"
} as const;

const ALLOWED_EDITING_SHORTCUT_KEYS = new Set<string>(
  Object.values(EDITING_SHORTCUT_KEY)
);

export function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(EDITABLE_KEYBOARD_TARGET_SELECTOR)
  );
}

export function isAllowedEditingShortcut(event: KeyboardEvent<HTMLElement>) {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) {
    return false;
  }

  const key = event.key.toLowerCase();

  return ALLOWED_EDITING_SHORTCUT_KEYS.has(key);
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
