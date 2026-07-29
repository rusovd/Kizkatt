import type { ReactNode } from "react";

import type { Tool } from "../model/types";
import {
  ArrowIcon,
  DiamondIcon,
  EllipseIcon,
  EraserIcon,
  FreedrawIcon,
  ImageIcon,
  LineIcon,
  LockedIcon,
  RectangleIcon,
  SelectionIcon,
  TextIcon,
  handIcon
} from "../ui/icons";

export type ToolDefinition = {
  icon: ReactNode;
  id: Tool;
  label: string;
  shortcut?: string;
};

export const TOOL_REGISTRY: ToolDefinition[] = [
  { id: "lock", label: "Lock", icon: LockedIcon },
  { id: "hand", label: "Hand", icon: handIcon },
  { id: "select", label: "Select", icon: SelectionIcon, shortcut: "1" },
  { id: "rectangle", label: "Rectangle", icon: RectangleIcon, shortcut: "2" },
  { id: "diamond", label: "Diamond", icon: DiamondIcon, shortcut: "3" },
  { id: "ellipse", label: "Ellipse", icon: EllipseIcon, shortcut: "4" },
  { id: "arrow", label: "Arrow", icon: ArrowIcon, shortcut: "5" },
  { id: "line", label: "Line", icon: LineIcon, shortcut: "6" },
  { id: "draw", label: "Draw", icon: FreedrawIcon, shortcut: "7" },
  { id: "text", label: "Text", icon: TextIcon, shortcut: "8" },
  { id: "image", label: "Image", icon: ImageIcon, shortcut: "9" },
  { id: "eraser", label: "Eraser", icon: EraserIcon, shortcut: "0" }
];

export const STYLE_TOOLS = new Set<Tool>([
  "rectangle",
  "diamond",
  "ellipse",
  "arrow",
  "line",
  "draw",
  "text",
  "image"
]);
