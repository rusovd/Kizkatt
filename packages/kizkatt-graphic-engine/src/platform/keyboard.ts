import type { KeyboardEvent } from "react";

export function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable='true'], [contenteditable=''], [role='textbox']"
    )
  );
}

export function isAllowedEditingShortcut(event: KeyboardEvent<HTMLElement>) {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) {
    return false;
  }

  const key = event.key.toLowerCase();

  return key === "a" || key === "c" || key === "v" || key === "z" || key === "y";
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
