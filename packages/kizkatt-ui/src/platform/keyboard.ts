import type { KeyboardEvent } from "react";


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
