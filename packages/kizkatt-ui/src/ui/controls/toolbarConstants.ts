import type { Tool } from "../../model/types";

export const TOOLBAR_SUBMENU_HOLD_MS = 800;
export const SHOW_TOOLBAR_SHORTCUTS = false;

export const NAVIGATION_TOOL_GROUP: readonly Tool[] = ["hand", "zoom"];

export const SHAPE_TOOL_GROUP: readonly Tool[] = [
  "rectangle",
  "diamond",
  "ellipse"
];

export const LINE_TOOL_GROUP: readonly Tool[] = [
  "draw",
  "polyline",
  "line"
];

export const SINGLE_TOOL_ORDER: readonly Tool[] = [
  "select",
  "nodeEdit",
  "text",
  "image",
  "eraser"
];
