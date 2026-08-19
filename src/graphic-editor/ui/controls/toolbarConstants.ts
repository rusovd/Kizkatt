import type { Tool } from "../../model/types";

export const TOOLBAR_SUBMENU_HOLD_MS = 800;
export const SHOW_TOOLBAR_SHORTCUTS = false;

export const SHAPE_TOOL_GROUP: readonly Tool[] = [
  "rectangle",
  "diamond",
  "ellipse"
];

export const LINE_TOOL_GROUP: readonly Tool[] = ["draw", "line"];

export const SINGLE_TOOL_ORDER: readonly Tool[] = [
  "hand",
  "select",
  "nodeEdit",
  "text",
  "image",
  "eraser"
];
