import type { KeyboardEvent } from "react";

import { EDITABLE_KEYBOARD_TARGET_SELECTORS } from "kizkatt-graphic-engine";

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

type ShortcutEvent = Pick<
  KeyboardEvent<HTMLElement>,
  "altKey" | "ctrlKey" | "key" | "metaKey"
>;

type PlatformNavigator = Navigator & {
  userAgentData?: {
    platform?: string;
  };
};

export function getKeyboardPlatform() {
  if (typeof navigator === "undefined") {
    return "";
  }

  const platformNavigator = navigator as PlatformNavigator;

  return (
    platformNavigator.userAgentData?.platform ??
    platformNavigator.platform ??
    platformNavigator.userAgent
  );
}

export function isAppleKeyboardPlatform(platform = getKeyboardPlatform()) {
  return /mac|iphone|ipad|ipod/i.test(platform);
}

export function formatKeyboardShortcut(
  key: string,
  {
    platform = getKeyboardPlatform(),
    shift = false
  }: {
    platform?: string;
    shift?: boolean;
  } = {}
) {
  const normalizedKey = key.length === 1 ? key.toUpperCase() : key;

  if (isAppleKeyboardPlatform(platform)) {
    return `${shift ? "⇧" : ""}⌘${normalizedKey}`;
  }

  return ["Ctrl", shift ? "Shift" : null, normalizedKey]
    .filter(Boolean)
    .join("+");
}

export function isPrimaryShortcutModifierPressed(
  event: ShortcutEvent,
  platform = getKeyboardPlatform()
) {
  if (event.altKey) {
    return false;
  }

  return isAppleKeyboardPlatform(platform) ? event.metaKey : event.ctrlKey;
}

export function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(EDITABLE_KEYBOARD_TARGET_SELECTOR)
  );
}

export function isAllowedEditingShortcut(event: KeyboardEvent<HTMLElement>) {
  if (!isPrimaryShortcutModifierPressed(event)) {
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
