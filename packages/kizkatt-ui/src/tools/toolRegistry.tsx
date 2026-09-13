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
  NodeEditIcon,
  PolylineIcon,
  RectangleIcon,
  SelectionIcon,
  TextIcon,
  ZoomIcon,
  handIcon
} from "../ui/icons";

export type ToolLabelKey =
  | "arrow"
  | "diamond"
  | "draw"
  | "ellipse"
  | "eraser"
  | "hand"
  | "image"
  | "line"
  | "nodeEdit"
  | "polyline"
  | "rectangle"
  | "select"
  | "text"
  | "zoom";

export type ToolDefinition = {
  icon: ReactNode;
  id: Tool;
  labelKey: ToolLabelKey;
  submenu?: "line" | "shape";
  shortcut?: string;
  showsStylingPanel?: boolean;
};

export const TOOL_REGISTRY_BY_ID: Record<Tool, ToolDefinition> = {
  arrow: {
    id: "arrow",
    labelKey: "arrow",
    icon: ArrowIcon,
    shortcut: "5",
    showsStylingPanel: true,
    submenu: "line"
  },
  diamond: {
    id: "diamond",
    labelKey: "diamond",
    icon: DiamondIcon,
    shortcut: "3",
    showsStylingPanel: true,
    submenu: "shape"
  },
  draw: {
    id: "draw",
    labelKey: "draw",
    icon: FreedrawIcon,
    shortcut: "7",
    showsStylingPanel: true,
    submenu: "line"
  },
  ellipse: {
    id: "ellipse",
    labelKey: "ellipse",
    icon: EllipseIcon,
    shortcut: "4",
    showsStylingPanel: true,
    submenu: "shape"
  },
  eraser: { id: "eraser", labelKey: "eraser", icon: EraserIcon, shortcut: "0" },
  hand: { id: "hand", labelKey: "hand", icon: handIcon },
  image: { id: "image", labelKey: "image", icon: ImageIcon, shortcut: "9" },
  line: {
    id: "line",
    labelKey: "line",
    icon: LineIcon,
    shortcut: "6",
    showsStylingPanel: true,
    submenu: "line"
  },
  nodeEdit: {
    id: "nodeEdit",
    labelKey: "nodeEdit",
    icon: NodeEditIcon
  },
  polyline: {
    id: "polyline",
    labelKey: "polyline",
    icon: PolylineIcon,
    showsStylingPanel: true,
    submenu: "line"
  },
  rectangle: {
    id: "rectangle",
    labelKey: "rectangle",
    icon: RectangleIcon,
    shortcut: "2",
    showsStylingPanel: true,
    submenu: "shape"
  },
  select: {
    id: "select",
    labelKey: "select",
    icon: SelectionIcon,
    shortcut: "1"
  },
  text: {
    id: "text",
    labelKey: "text",
    icon: TextIcon,
    shortcut: "8"
  },
  zoom: {
    id: "zoom",
    labelKey: "zoom",
    icon: ZoomIcon
  }
};

export const TOOL_REGISTRY: ToolDefinition[] =
  Object.values(TOOL_REGISTRY_BY_ID);
