import {
  getActiveInteractionCursor as getDefaultActiveInteractionCursor
} from "kizkatt-graphic-engine";
import type {
  Interaction,
  KizkattTheme,
  Tool
} from "../../model/types";

function svgCursor(svg: string, fallback: string, hotspot = { x: 12, y: 12 }) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspot.x} ${hotspot.y}, ${fallback}`;
}

const GRABBING_HAND_PATH =
  "M7.5 11.4V7a1.45 1.45 0 0 1 2.9 0v4.1m0-4.9V4.5a1.45 1.45 0 0 1 2.9 0v6.6m0-4.9a1.45 1.45 0 0 1 2.9 0v4.9m0-3.8a1.45 1.45 0 0 1 2.9 0v7a6.2 6.2 0 0 1-6.2 6.2h-1.3a6 6 0 0 1-5.1-2.8l-2.1-3.4a1.55 1.55 0 0 1 .46-2.08a1.7 1.7 0 0 1 2.22.3l.42.48Z";
const POINTER_HAND_PATH =
  "M9.5 11.6V5.9a1.15 1.15 0 0 1 2.3 0v6.3m0-2.35 1.3-.85a1.05 1.05 0 0 1 1.6.9v2.3m0-1.65 1.2-.7a1.05 1.05 0 0 1 1.58.92v2.45m0-1.55.92-.42a1.05 1.05 0 0 1 1.48.96v2.3a4.9 4.9 0 0 1-4.9 4.9h-1.45a4.75 4.75 0 0 1-3.95-2.1l-2.15-3.25a1.2 1.2 0 0 1 .28-1.6 1.27 1.27 0 0 1 1.7.15l1.08 1.1";
const POINTER_PATH =
  "M4.4 3.2 15.5 6.45 8.85 15.85Z";
const DARK_CURSOR_THEME: KizkattTheme = "dark";

function getThemedCursorColor(theme: KizkattTheme = DARK_CURSOR_THEME) {
  return theme === "light" ? "#222222" : "#ffffff";
}

function getThemedCursorPalette(theme: KizkattTheme = DARK_CURSOR_THEME) {
  return {
    color: getThemedCursorColor(theme),
    outline: theme === "light" ? "#ffffff" : "#222222"
  };
}

function getNodeEditPointerSvg(color: string, outline: string) {
  return [
    `<path fill="${color}" stroke="${outline}" stroke-width="2.8" stroke-linejoin="round" d="${POINTER_PATH}"/>`,
    `<path fill="${color}" stroke="${color}" stroke-width="0.8" stroke-linejoin="round" d="${POINTER_PATH}"/>`
  ].join("");
}

function getNodeEditStrokeSvg(path: string, color: string, outline: string) {
  return [
    `<path d="${path}" fill="none" stroke="${outline}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<path d="${path}" fill="none" stroke="${color}" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/>`
  ].join("");
}

export function getHandCursor(theme: KizkattTheme = DARK_CURSOR_THEME) {
  const color = getThemedCursorColor(theme);

  return svgCursor(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path fill="none" stroke="${color}" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" d="${POINTER_HAND_PATH}"/>
  </svg>`,
  "grab",
  { x: 10, y: 6 }
  );
}

export function getGrabbingCursor(theme: KizkattTheme = DARK_CURSOR_THEME) {
  const color = getThemedCursorColor(theme);

  return svgCursor(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path fill="none" stroke="${color}" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" transform="translate(1.25 1.3) scale(.88)" d="${GRABBING_HAND_PATH}"/>
  </svg>`,
  "grabbing"
  );
}

export function getNodeEditCursor(theme: KizkattTheme = DARK_CURSOR_THEME) {
  const { color, outline } = getThemedCursorPalette(theme);

  return svgCursor(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    ${getNodeEditPointerSvg(color, outline)}
  </svg>`,
  "default",
  { x: 4, y: 3 }
  );
}

export function getNodeEditPointCursor(theme: KizkattTheme = DARK_CURSOR_THEME) {
  const { color, outline } = getThemedCursorPalette(theme);

  return svgCursor(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    ${getNodeEditPointerSvg(color, outline)}
    ${getNodeEditStrokeSvg("M17.3 15.3v5.4M14.6 18h5.4", color, outline)}
  </svg>`,
  "default",
  { x: 4, y: 3 }
  );
}

export function getNodeEditSelectionCursor(
  theme: KizkattTheme = DARK_CURSOR_THEME
) {
  const { color, outline } = getThemedCursorPalette(theme);

  return svgCursor(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    ${getNodeEditPointerSvg(color, outline)}
    <rect x="13.3" y="14.2" width="7.1" height="5.1" rx="0.45" fill="none" stroke="${outline}" stroke-width="2.5" stroke-linecap="butt" stroke-dasharray="2.2 2.1"/>
    <rect x="13.3" y="14.2" width="7.1" height="5.1" rx="0.45" fill="none" stroke="${color}" stroke-width="1.25" stroke-linecap="butt" stroke-dasharray="2.2 2.1"/>
  </svg>`,
  "default",
  { x: 4, y: 3 }
  );
}

export function getNodeEditLineCursor(theme: KizkattTheme = DARK_CURSOR_THEME) {
  const { color, outline } = getThemedCursorPalette(theme);

  return svgCursor(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    ${getNodeEditPointerSvg(color, outline)}
    ${getNodeEditStrokeSvg("M14.6 18.4c1.3-2.25 4.25-2.55 5.9-.6", color, outline)}
  </svg>`,
  "pointer",
  { x: 4, y: 3 }
  );
}

export const NODE_EDIT_CURSOR = getNodeEditCursor();
export const NODE_EDIT_POINT_CURSOR = getNodeEditPointCursor();
export const NODE_EDIT_SELECTION_CURSOR = getNodeEditSelectionCursor();
export const NODE_EDIT_LINE_CURSOR = getNodeEditLineCursor();

export const NODE_DRAG_CURSOR = getNodeEditPointCursor();

export function getObjectDragCursor(theme: KizkattTheme = DARK_CURSOR_THEME) {
  const color = getThemedCursorColor(theme);

  return svgCursor(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path fill="none" stroke="${color}" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" transform="translate(1.25 1.3) scale(.88)" d="${GRABBING_HAND_PATH}"/>
    <rect x="14.2" y="13.8" width="4.3" height="4.3" rx="0.55" fill="none" stroke="${color}" stroke-width="1.15"/>
    <circle cx="18.7" cy="18.7" r="2.35" fill="none" stroke="${color}" stroke-width="1.15"/>
  </svg>`,
  "grabbing"
  );
}

export function getCenterDragCursor(theme: KizkattTheme = DARK_CURSOR_THEME) {
  const color = getThemedCursorColor(theme);

  return svgCursor(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path fill="none" stroke="${color}" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" transform="translate(1.25 1.3) scale(.88)" d="${GRABBING_HAND_PATH}"/>
    <circle cx="18.3" cy="17.9" r="3.25" fill="none" stroke="${color}" stroke-width="1.2"/>
    <path d="M15.95 17.9 H20.65 M18.3 15.55 V20.25" fill="none" stroke="${color}" stroke-width="1.15" stroke-linecap="round"/>
  </svg>`,
  "grabbing"
  );
}

export const OBJECT_DRAG_CURSOR = getObjectDragCursor();
export const CENTER_DRAG_CURSOR = getCenterDragCursor();

export function getInteractionCursor(
  interaction: Interaction | null,
  theme: KizkattTheme = DARK_CURSOR_THEME
) {
  if (interaction?.type === "moveTransformCenter") {
    return getCenterDragCursor(theme);
  }

  if (
    interaction?.type === "bend" ||
    interaction?.type === "bezierControl" ||
    interaction?.type === "linearSegmentBend" ||
    interaction?.type === "linearNodes" ||
    (interaction?.type === "linearEndpoint" && interaction.mode === "node")
  ) {
    return getNodeEditPointCursor(theme);
  }

  if (interaction?.type === "move") {
    return getObjectDragCursor(theme);
  }

  if (
    interaction?.type === "linearEndpoint" ||
    interaction?.type === "rotate" ||
    interaction?.type === "skew"
  ) {
    return getGrabbingCursor(theme);
  }

  return getDefaultActiveInteractionCursor(interaction);
}

export function getCanvasCursor({
  hasSelection = false,
  isPanning,
  theme = DARK_CURSOR_THEME,
  tool
}: {
  hasSelection?: boolean;
  isPanning: boolean;
  theme?: KizkattTheme;
  tool: Tool;
}) {
  if (isPanning) {
    return getGrabbingCursor(theme);
  }

  if (tool === "nodeEdit") {
    return hasSelection
      ? getNodeEditSelectionCursor(theme)
      : getNodeEditCursor(theme);
  }

  if (tool === "select") {
    return "default";
  }

  if (tool === "hand") {
    return getHandCursor(theme);
  }

  if (tool === "zoom") {
    return "zoom-in";
  }

  return "crosshair";
}
