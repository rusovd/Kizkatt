import {
  getActiveInteractionCursor as getDefaultActiveInteractionCursor
} from "kizkatt-graphic-engine";
import type {
  Interaction,
  Tool
} from "../../model/types";

function svgCursor(svg: string, fallback: string) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 12 12, ${fallback}`;
}

const GRABBING_HAND_PATH =
  "M7.5 11.4V7a1.45 1.45 0 0 1 2.9 0v4.1m0-4.9V4.5a1.45 1.45 0 0 1 2.9 0v6.6m0-4.9a1.45 1.45 0 0 1 2.9 0v4.9m0-3.8a1.45 1.45 0 0 1 2.9 0v7a6.2 6.2 0 0 1-6.2 6.2h-1.3a6 6 0 0 1-5.1-2.8l-2.1-3.4a1.55 1.55 0 0 1 .46-2.08a1.7 1.7 0 0 1 2.22.3l.42.48Z";

const HAND_CURSOR = svgCursor(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path fill="#ffffff" stroke="#222222" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" d="M8.2 13.3V6.2a1.45 1.45 0 0 1 2.9 0v5.9m0-6.1V4.1a1.45 1.45 0 0 1 2.9 0v8m0-6.1a1.45 1.45 0 0 1 2.9 0v6.1m0-4.6a1.45 1.45 0 0 1 2.9 0v7.1a6.1 6.1 0 0 1-6.1 6.1h-1.6a5.8 5.8 0 0 1-4.9-2.7l-3-5.1a1.55 1.55 0 0 1 .45-2.05a1.7 1.7 0 0 1 2.25.28l1.3 1.37Z"/>
  </svg>`,
  "grab"
);

const GRABBING_CURSOR = svgCursor(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path fill="#ffffff" stroke="#222222" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" d="${GRABBING_HAND_PATH}"/>
  </svg>`,
  "grabbing"
);

export const NODE_DRAG_CURSOR = svgCursor(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path fill="#ffffff" stroke="#222222" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" d="${GRABBING_HAND_PATH}"/>
    <circle cx="18.6" cy="17.6" r="3.25" fill="#7c73f4" stroke="#ffffff" stroke-width="1.3"/>
    <circle cx="18.6" cy="17.6" r="3.25" fill="none" stroke="#222222" stroke-width="0.75"/>
  </svg>`,
  "grabbing"
);

export const OBJECT_DRAG_CURSOR = svgCursor(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path fill="#ffffff" stroke="#222222" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" d="${GRABBING_HAND_PATH}"/>
    <rect x="14.7" y="14.1" width="4.7" height="4.7" rx="0.7" fill="#ffffff" stroke="#222222" stroke-width="1"/>
    <circle cx="19.3" cy="18.9" r="2.6" fill="#7c73f4" stroke="#ffffff" stroke-width="1.1"/>
    <circle cx="19.3" cy="18.9" r="2.6" fill="none" stroke="#222222" stroke-width="0.65"/>
  </svg>`,
  "grabbing"
);

export function getInteractionCursor(interaction: Interaction | null) {
  if (
    interaction?.type === "bend" ||
    interaction?.type === "bezierControl" ||
    interaction?.type === "linearNodes" ||
    (interaction?.type === "linearEndpoint" && interaction.mode === "node")
  ) {
    return NODE_DRAG_CURSOR;
  }

  if (interaction?.type === "move") {
    return OBJECT_DRAG_CURSOR;
  }

  return getDefaultActiveInteractionCursor(interaction);
}

export function getCanvasCursor({
  isPanning,
  tool
}: {
  isPanning: boolean;
  tool: Tool;
}) {
  if (isPanning) {
    return GRABBING_CURSOR;
  }

  if (tool === "select" || tool === "nodeEdit") {
    return "default";
  }

  if (tool === "hand") {
    return HAND_CURSOR;
  }

  if (tool === "zoom") {
    return "zoom-in";
  }

  return "crosshair";
}
